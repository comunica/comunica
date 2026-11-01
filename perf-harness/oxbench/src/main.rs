// Phase timings of Oxigraph (in-memory store) for SPARQL queries: parse, optimize, execute, serialize.
// Usage: oxbench <dataset.nt> <reps> <query-file>...
use oxigraph::io::RdfFormat;
use oxigraph::sparql::{QueryResults, SparqlEvaluator};
use oxigraph::store::Store;
use sparesults::{QueryResultsFormat, QueryResultsSerializer};
use spargebra::{Query, SparqlParser};
use sparopt::algebra::GraphPattern;
use sparopt::Optimizer;
use std::fs;
use std::io::BufReader;
use std::time::Instant;

fn median(mut v: Vec<f64>) -> f64 {
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    v[v.len() / 2]
}

fn run_select(store: &Store, query: &str, serialize: bool) -> usize {
    let prepared = SparqlEvaluator::new().parse_query(query).unwrap();
    match prepared.on_store(store).execute().unwrap() {
        QueryResults::Solutions(solutions) => {
            let variables = solutions.variables().to_vec();
            if serialize {
                let mut serializer = QueryResultsSerializer::from_format(QueryResultsFormat::Json)
                    .serialize_solutions_to_writer(Vec::new(), variables)
                    .unwrap();
                let mut n = 0;
                for solution in solutions {
                    serializer.serialize(&solution.unwrap()).unwrap();
                    n += 1;
                }
                let bytes = serializer.finish().unwrap();
                std::hint::black_box(bytes);
                n
            } else {
                let mut n = 0;
                for solution in solutions {
                    std::hint::black_box(solution.unwrap());
                    n += 1;
                }
                n
            }
        }
        _ => 0,
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let reps: usize = args[2].parse().unwrap();
    let store = Store::new().unwrap();
    let start = Instant::now();
    let mut loader = store.bulk_loader();
    loader
        .load_from_reader(RdfFormat::NTriples, BufReader::new(fs::File::open(&args[1]).unwrap()))
        .unwrap();
    loader.commit().unwrap();
    eprintln!("loaded {} quads in {:.1}s", store.len().unwrap(), start.elapsed().as_secs_f64());

    let mut queries = Vec::new();
    for file in &args[3..] {
        let name = std::path::Path::new(file).file_stem().unwrap().to_string_lossy().to_string();
        let content = fs::read_to_string(file).unwrap();
        for (i, q) in content.split("\n\n").map(str::trim).filter(|q| !q.is_empty()).enumerate() {
            queries.push((format!("{name}#{i}"), q.to_string()));
        }
    }

    // Warm up
    for _ in 0..3 {
        for (_, q) in &queries {
            run_select(&store, q, true);
        }
    }

    println!("query\tresults\tparse_ms\toptimize_ms\texecute_ms\texecute_serialize_ms");
    for (name, q) in &queries {
        let (mut parse, mut optimize, mut execute, mut full) = (vec![], vec![], vec![], vec![]);
        let mut n = 0;
        for _ in 0..reps {
            let t = Instant::now();
            let parsed = SparqlParser::new().parse_query(q).unwrap();
            parse.push(t.elapsed().as_secs_f64() * 1000.0);
            if let Query::Select { pattern, .. } = &parsed {
                let t = Instant::now();
                std::hint::black_box(Optimizer::optimize_graph_pattern(GraphPattern::from(pattern)));
                optimize.push(t.elapsed().as_secs_f64() * 1000.0);
            }
            let t = Instant::now();
            n = run_select(&store, q, false);
            execute.push(t.elapsed().as_secs_f64() * 1000.0);
            let t = Instant::now();
            run_select(&store, q, true);
            full.push(t.elapsed().as_secs_f64() * 1000.0);
        }
        println!(
            "{name}\t{n}\t{:.4}\t{:.4}\t{:.4}\t{:.4}",
            median(parse),
            median(optimize),
            median(execute),
            median(full)
        );
    }
}
