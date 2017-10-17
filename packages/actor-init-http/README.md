# Comunica HTTP Init Actor

An example init actor for Comunica that triggers a HTTP request using the HTTP bus.

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitHttp`,
the actor allows optional HTTP request parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
combine it with the parameters from the config file,
perform the request, and print its response to stdout.

When `@comunica/runner-cli`, `@comunica/runner`
and any HTTP actor (such as `@comunica/actor-http-node-fetch`) are installed,
executing the following:

```
$ node_modules/.bin/comunica-run config/config-example.json http://fragments.linkedsoftwaredependencies.org
```

will print the response.
