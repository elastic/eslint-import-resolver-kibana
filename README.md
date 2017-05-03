# eslint-import-resolver-kibana

Resolver for Kibana imports, meant to be used with [eslint-plugin-import](https://github.com/benmosher/eslint-plugin-import).

## Usage

In your `.eslintrc.(yml|json|js)` file, add the following `import/resolver` under `settings`:

```yml
# .eslintrc.yml
settings:
  # uses 'eslint-import-resolver-kibana':
  import/resolver:
    - node
    - kibana
```

The `node` resolver isn't strictly required, but the resolving rules are unlikely to work as you expect if you don't include it in the list of resolvers. It's only included by default if you don't specify other resolvers.

The resolved assumed that the Kibana path exists at the same level as your plugin. If your Kibana path is somewhere else, you can specify it in the resolver settings, like so:

```yml
# .eslintrc.yml
settings:
  import/resolver:
    kibana: { kibanaPath: '/path/to/kibana' }
```

See [the resolvers docs](https://github.com/benmosher/eslint-plugin-import#resolvers) or the [resolver spec](https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#resolvesource-file-config---found-boolean-path-string-) for more details.