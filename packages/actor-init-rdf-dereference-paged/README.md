# Comunica RDF Dereference Paged

An example init actor for Comunica that triggers an RDF Dereference Paged event for the given URL.

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitRdfDereferencePaged`,
the actor allows optional URL parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
or take it from the config file if not available,
perform the request, and print its response to stdout.

When `@comunica/runner-cli`, `@comunica/runner` and the appropriate actor modules are installed,
executing the following:

```
$ node_modules/.bin/comunica-run config/config-example.json
```

will print the response.

**Note: when running in a dev environment:**
Make sure that your `NODE_PATH` contains the `node_modules` folder of this module.
