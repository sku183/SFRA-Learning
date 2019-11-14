# SFRA Webpack builder

## Why use it?
Webpack can be cumbersome to setup, especially in multicartridge projects for SFRA.
This plugin let you bundle all your `js`, `scss` and `jsx` files out of the box.

- One pre-build `webpack.config.js` for all cartridges and plugins
- No more `sgmf-script`, which interferes with `Prophet uploader`
- Supports multicartridge projects due to simple configuration
- Supports aliases for `commonjs` or `esm` loading
- Supports eslint while watching
- Supports reuse of node_modules dependencies from other cartridges

## Prerequisite

- Clone this repository and place it in a folder structure like shown below.
- Run `npm install`.
- Install [SFRA](https://github.com/SalesforceCommerceCloud/storefront-reference-architecture)
- Go inside the *SFRA* directory and run `npm install` 
- Go inside your *SFRA plugin* directories and run `npm install`

Example Structure

```
.
+-- storefront-reference-applicaton
+-- plugin_one
+-- plugin_two
+-- ....
+-- sfra-webpack-builder
```

***Make sure you installed node_modules in your plugins as well using npm install command***

**Other structures are also supported - configure the path accordingly in `sfraBuilderConfig.js`**

## Usage

- Run `npm install`.
- Copy `webpackHandling/example_sfraBuilderConfig.js` to `webpackHandling/sfraBuilderConfig.js` to define your own config
- Configure *cartridges* and *aliases* in `webpackHandling/sfraBuilderConfig.js` 
**(Ensure that the paths in `webpackHandling/sfraBuilderConfig.js` point correctly to the included SFRA and plugins according to your directory structure)** The paths needs to be set relatively to *webpack.config.js*
- Run `npm run watch` or `npm run prod`. This will compile all related `js/jsx & css` files included in the directories which are defined in `webpackHandling/sfraBuilderConfig.js`

### Aliases

`module.exports.aliasConfig` let you specify, how to load module packages inside your plugin. Further information can be found in the [WebpackDocumentation](https://webpack.js.org/configuration/resolve/)

```js
module.exports.aliasConfig = {
    // enter all aliases to configure
    base: path.resolve(
        process.cwd(),
        '../storefront-reference-architecture/cartridges/app_storefront_base/cartridge/client/default/'
    ),
    CustomPlugin: path.resolve(
        process.cwd(),
        '../plugin_wishlists/cartridges/plugin_wishlists/cartridge/client/default/'
    )
}
```

The alias `CustomPlugin` allows to retrieve modules through cartridges by using `require('CustomPlugin/default/js/myFile.js');` or `import Foo from CustomPlugin/default/js/myFile`;

### Testing
This project contains tests which rely on `mocha`.
Please run using `npm run test`

### Acknowledgement
This project was inspired by, and is a heavily modified version of [sfra-webpack-setup](https://github.com/danechitoaie/sfra-webpack-setup)

Thanks to *@danechitoaie* (https://github.com/danechitoaie)