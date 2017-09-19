# Comunica Hello World Init Actor

An example Hello World init actor for Comunica.

The `config/config-example.json` contains an example on how to run the Hello World actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitHelloWorld`,
the actor allows the 'hello' parameter to be changed,
and defaults to 'Hello'.

When executed, the actor will print the 'hello' parameter value
to the console, followed by all command line parameters.

Assuming `@comunica/runner-cli` and `@comunica/runner` are installed,
executing the following:

```
$ node node_modules/.bin/comunica-run config/config-example.json Desmond Hume
```

will print `Hi Desmond Hume`.
