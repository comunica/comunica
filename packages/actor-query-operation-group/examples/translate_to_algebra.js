const path = require('path');
const fs = require('fs');
const { translate } = require('sparqlalgebrajs');

function main() {
  in_dir = process.argv[2];
  working_dir = process.cwd();
  dir = path.resolve(working_dir, in_dir);
  console.log(`Translating examples in ${in_dir} (${dir})`);

  fs.readdirSync(dir).forEach((file_name) => {
    const file_path = path.join(dir, file_name);
    const stat = fs.statSync(file_path);

    if (stat.isFile() && file_name.endsWith('.sparql')) {
      console.log(`Translating ${file_name}`);
      const input = fs.readFileSync(file_path).toString();
      console.log(`Input:\n${input}\n`);
      const algebra = translate(input);
      const output = JSON.stringify(algebra, undefined, 4);
      const output_path = file_path + '.json';
      fs.writeFileSync(output_path, output);
    } else {
      console.log(`Skipping ${file_name}`);
    }
  })
}

main();