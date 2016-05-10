module.exports = function metaLoader(source) {
  this.cacheable();

  // Define an api which can be called by the plugins
  const styleguidePluginPromisses = [];
  const renderToStyleguideApi = function renderToStyleguideApi(pluginOptions) {
    if (!pluginOptions || !pluginOptions.name) {
      throw new Error('Plugin name is mandatory');
    }

    styleguidePluginPromisses.push(new Promise((resolve, reject) => {
      Promise.resolve(pluginOptions.frontendData)
        .then((result) => resolve({
          name: pluginOptions.name,
          result,
          frontendPlugin: pluginOptions.frontendPlugin,
        }))
        .catch((err) => reject(err));
    }));
  };

  const data = { source, module };

  // Trigger events for styleguide child plugins
  this._compilation.applyPlugins( // eslint-disable-line no-underscore-dangle
    'styleguide-plugin-before-processing',
    data,
    this
  );

  this._compilation.applyPlugins( // eslint-disable-line no-underscore-dangle
    'styleguide-plugin-processing',
    renderToStyleguideApi,
    data,
    this
  );

  // Execute all plugins and return the module code
  const callback = this.async();
  Promise.all(styleguidePluginPromisses)
    .then((styleguidPlugins) => styleguidPlugins
      .filter((styleguidePlugin) => styleguidePlugin.result !== undefined)
      .map((styleguidePlugin) => {
        return `{
          name: ${JSON.stringify(styleguidePlugin.name)},
          result: ${JSON.stringify(styleguidePlugin.result)},
          frontendPlugin: ${styleguidePlugin.frontendPlugin}
        }`;
      })
    )
    .then((componentData) => callback(
      null,
      `
      var data = ${JSON.stringify(data)};
      module.exports = [${componentData.join(',')}];
      `
    ))
    .catch((err) => callback(err));
};
