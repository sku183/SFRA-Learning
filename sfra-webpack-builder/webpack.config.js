'use strict';

const path = require('path');
const glob = require('glob');
// @Todo - replace as this is not maintained anymore
const WebpackExtractTextPlugin = require('extract-text-webpack-plugin');
// - cleans static folder
const WebpackCleanPlugin = require('clean-webpack-plugin');
// - linter
const WebpackStyleLintPlugin = require('stylelint-webpack-plugin');
// - minification
const TerserPlugin = require('terser-webpack-plugin');
const sfraBuilderConfig = require('./webpackHandling/sfraBuilderConfig');
const webpackHelper = require('./webpackHandling/helper');
process.noDeprecation = true;

/**
 * Multicartridge webpack configuration.
 */
class WebpackBundle {

    /**
     * Scans the cartridge client side source folder and returns an
     * object with sass and javascript files.
     *
     * @param {string} cartridge - The cartridge name
     * @return {Object} - Object of sass and js files
     */
    static scanEntryPoints(cartridge, fileType) {
        const srcPath = path.resolve(__dirname, cartridge, 'cartridge/client');
        const srcSCSSPath = path.join(srcPath, '*', 'scss', '**', '*.scss');
        const srcJSPath = path.join(srcPath, '*', 'js', '**', '*.js');
        const srcJSXPath = path.join(srcPath, '*', 'jsx', '*.jsx');
        let files = {};

        // Scan scss files
        if (fileType === 'scss') {
            glob.sync(srcSCSSPath)
            .filter(source => !path.basename(source).startsWith('_'))
            .map((source) => {
                let sourceRelativePath = path.dirname(path.relative(srcPath, source));
                sourceRelativePath = sourceRelativePath.split(path.sep);
                sourceRelativePath[1] = sourceRelativePath[1].replace('scss', 'css');
                sourceRelativePath = sourceRelativePath.join(path.sep);
                const sourceName = path.basename(source).replace('scss', 'css');
                const outputFile = path.join(sourceRelativePath, sourceName);
                files[outputFile] = source;
                return source;
            });
        }

        // Scan js files
        if (fileType === 'js') {
            glob.sync(srcJSPath)
            .filter(source => !path.basename(source).startsWith('_'))
            .map((source) => {
                const sourceRelativePath = path.dirname(path.relative(srcPath, source));
                const sourceName = path.basename(source);
                const outputFile = path.join(sourceRelativePath, sourceName);
                files[outputFile] = source;
                return source;
            });

            // Scan jsx files. The output file will copy to static/default/js folder.
            glob.sync(srcJSXPath)
            .map((source) => {
                const sourceRelativePath = path.dirname(path.relative(srcPath, source));
                const sourceName = path.basename(source);
                const outputFile = path.join(
                    sourceRelativePath.replace('jsx', 'js'),
                    sourceName.replace('.jsx', '.js')
                );
                files[outputFile] = source;
                return source;
            });
        }
        return files;
    }

   /**
    * Plugins based on the filetype.
    * @param {string} cartridge - The cartridge path
    * @param {string} fileType - determines compilation type
    * @param {boolean} isDevelopment - determines compile mode
    * @return {array} - Array of Plugins
    */
    static getPlugins(cartridge, fileType, env) {
        var plugins = [
            new WebpackCleanPlugin(['*/js', '*/jsx', '*/css'], {
                root: path.resolve(__dirname, cartridge, 'cartridge', 'static'),
                verbose: false
            })
        ];
        if (fileType === 'scss') {
            if (env.useLinter) {
                plugins.push(new WebpackStyleLintPlugin({ files: 'src/**/*.scss' }));
            }
            plugins.push(new WebpackExtractTextPlugin('[name]'));
        }
        if (env.dev === false) {
            plugins.push(new TerserPlugin());
        }
        return plugins;
    }

    /**
    * @typedef {{base: string}} alias
    */

    /**
     * Webpack uses aliases for module resolving, we build this dynamically so the same alias
     * can be used for a different file type
     * @param {object} cartridgeAliases - Aliases which are avaible for module resolution
     * @param {string} fileType - JS/JSX or scss
     * @returns {object} More dynamic aliases 
     */
    static buildDynamicAliases(cartridgeAliases, fileType) {
        let aliases = {};
        let aliasKeys = Object.keys(cartridgeAliases);
        for (const key of aliasKeys) {
            aliases[key] = cartridgeAliases[key] + '/' + fileType;
        }
        return aliases;
    }

    /**
    * @typedef {{dev: boolean, useLinter: boolean}} env
    */

   /**
    * Returns the webpack config object tree.
    * @param {object} env - Environment variable which can be passed through commandline
    * @param {string} cartridge - The cartridge name
    * @return {Object} - Webpack config
    */
    static bundleCartridge(env = {}, cartridge, fileType) {
        let entryFiles =  this.scanEntryPoints(cartridge, fileType);
        if (Object.keys(entryFiles).length === 0) {
            console.error('Entry not found - please check if js and scss folder exist in your cartridge : ' + cartridge);
            return {};
        }

        if (Object.keys(sfraBuilderConfig.aliasConfig).length === 0 || 
            Object.keys(sfraBuilderConfig.aliasConfig.alias).length === 0) {
            console.error('Alias config missing - needed for SFRA to compile - exiting');
            return {};
        }

        const outputPath = path.resolve(__dirname, cartridge, 'cartridge', 'static');
        let ruleSet = webpackHelper.buildRuleSet(__dirname, cartridge, env, fileType);
        let plugins = this.getPlugins(cartridge, fileType, env);
        let modulePaths = [];
        const aliases = this.buildDynamicAliases(sfraBuilderConfig.aliasConfig.alias, fileType);
        // loop through all cartridges for node_modules lookup
        // this allows to require node_modules from every plugin, regardless if those
        // modules are installed in the given plugin
        sfraBuilderConfig.cartridges.map(includeCartridges => {
            modulePaths.push(path.resolve(includeCartridges.split('cartridges')[0], 'node_modules'));
        });
        return {
            mode: env.dev === true ? 'development' : 'production',
            name: cartridge + '/' + fileType,
            stats: { children: false },
            entry: entryFiles,
            output: {
                path: outputPath,
                filename: '[name]'
            },
            resolve: {
                alias: aliases,
                modules: modulePaths
            },
            module: {
                rules: ruleSet
            },
            plugins: plugins,
            devtool: env.dev === true ? 'source-map' : undefined,
            cache: true
        };
    }
}

// default export function
module.exports = env => {
    let bundlesFiles = [];
    if (env.testrunner) {
       return invokeTestRunner();
    } else {
        sfraBuilderConfig.cartridges.map(cartridge => {
            bundlesFiles.push(WebpackBundle.bundleCartridge(env, cartridge, 'js'));
            bundlesFiles.push(WebpackBundle.bundleCartridge(env, cartridge, 'scss'));
        });
    }
    return bundlesFiles;
};

// exposed for testability
module.exports.getPlugins = WebpackBundle.getPlugins;
module.exports.buildDynamicAliases = WebpackBundle.buildDynamicAliases;
module.exports.scanEntryPoints = WebpackBundle.scanEntryPoints;
module.exports.bundleCartridge = WebpackBundle.bundleCartridge;

/**
 * Testrunner allows to run the webpack config in testable context
 */
function invokeTestRunner () {
    let bundlesFiles = [];
    let sfraBuilderConfigFake = {};
    let env = {};
    env.dev = false;
    sfraBuilderConfigFake.cartridges = [
        path.resolve('./test/fixtures')
    ];
    sfraBuilderConfigFake.cartridges.map(cartridge => {
        bundlesFiles.push(WebpackBundle.bundleCartridge(env, cartridge, 'js'));
        bundlesFiles.push(WebpackBundle.bundleCartridge(env, cartridge, 'scss'));
    });
    return bundlesFiles;
}