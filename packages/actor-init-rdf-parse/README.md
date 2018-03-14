# Comunica RDF Parse

An example init actor for Comunica that triggers an RDF Parse event for the given input stream.

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitRdfParse`,
the actor allows optional HTTP request parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
combine it with the parameters from the config file,
perform the request, and print its response to stdout.

When `@comunica/runner-cli`, `@comunica/runner`
and any HTTP actor (such as `@comunica/actor-http-node-fetch`) are installed,
executing the following:

```
$ curl -H "Accept: application/trig" https://fragments.linkedsoftwaredependencies.org/npm | node_modules/.bin/comunica-run config/config-example.json
```

will print the response.

**Note: when running in a dev environment:**
Make sure that your `NODE_PATH` contains the `node_modules` folder of this module.
