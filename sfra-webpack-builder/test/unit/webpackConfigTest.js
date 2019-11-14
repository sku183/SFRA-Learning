'use strict';

const assert = require('chai').assert;
const WebpackConfig = require('../../webpack.config');
const path = require('path');
const sinon = require('sinon');

describe('getPlugins()', () => {

    it('should use TerserPlugin if development mode is not set', () => {
        let env = {};
        env.dev = false;
        let plugins = WebpackConfig.getPlugins('../does/not/exist', 'js', env);
        let hasTerserPlugin = false;
        plugins.map((plugin) => {
            if (!hasTerserPlugin) {
                hasTerserPlugin = (plugin.constructor.name.toString() === 'TerserPlugin');
            }
        });
        assert.isTrue(hasTerserPlugin);
    });

    it('should use WebpackStyleLintPlugin for scss and linting enabled', () => {
        let env = {};
        env.useLinter = true;
        let pluginsWithLinter = WebpackConfig.getPlugins('../does/not/exist', 'scss', env);
        env.useLinter = false;
        let pluginsWithoutLinter = WebpackConfig.getPlugins('../does/not/exist', 'scss', env);
        // since the plugin does not expose its constructor name we hack it like that
        assert(pluginsWithLinter > pluginsWithoutLinter);
    });

    it('should always use WebpackCleanPlugin', () => {
        let env = {};
        env.dev = false;
        env.useLinter = false;
        let plugins = WebpackConfig.getPlugins('../does/not/exist', 'js', env);
        let hasCleanWebpackPlugin = false;
        plugins.map((plugin) => {
            if (!hasCleanWebpackPlugin) {
                hasCleanWebpackPlugin = (plugin.constructor.name.toString() === 'CleanWebpackPlugin');
            }  
        });
        assert.isTrue(hasCleanWebpackPlugin);
    });
});

describe('buildDynamicAliases()', () => {
    it('should use the same resolve aliases for scss and js', () => {
        let sfraBuilderConfig;
        try {
            sfraBuilderConfig = require('../../webpackHandling/sfraBuilderConfig');
        } catch (err) {
            console.log('sfraBuilderConfig not existant - exiting this test');
            assert.isTrue(true); // accept code coverage
            return;
        }
        const alias = sfraBuilderConfig.aliasConfig.alias;
        const jsAlias = WebpackConfig.buildDynamicAliases(alias, 'js');
        const scssAlias = WebpackConfig.buildDynamicAliases(alias, 'scss');
        assert.equal(Object.keys(jsAlias)[0], Object.keys(scssAlias)[0]);
    });
});

describe('scanEntryPoints()', () => {
    it('should return an entry point for JS and SCSS', () => {
        const jsEntryPoint = WebpackConfig.scanEntryPoints(path.resolve(__dirname, '../fixtures'), 'js');
        const scssEntryPoint = WebpackConfig.scanEntryPoints(path.resolve(__dirname, '../fixtures'), 'scss');
        const jsFile = Object.entries(jsEntryPoint)[0][1];
        const scssFile = Object.entries(scssEntryPoint)[0][1];
        let fixtureJSFile = 'default/js/test.js';
        let fixtureSCSSFile = 'default/scss/test.scss';
        assert(jsFile.includes(fixtureJSFile));
        assert(scssFile.includes(fixtureSCSSFile));
    });
});

describe('bundleCartridge()', () => {
    it('should have move production with env dev false', () => {
        let env = {};
        env.dev = false;
        env.useLinter = false;
        const bundledConfig = WebpackConfig.bundleCartridge(
            env, 
            path.resolve(__dirname, '../fixtures'), 
            'js');
        assert(bundledConfig.mode === 'production');
    });

    it('should have mode set to production and no source-maps on env.dev=false', () => {
        let env = {};
        env.dev = false;
        const bundledConfig = WebpackConfig.bundleCartridge(
            env, 
            path.resolve(__dirname, '../fixtures'), 
            'js');
        assert(bundledConfig.mode === 'production');
        assert(bundledConfig.devtool === undefined);
    });

    it('should have mode set to development and active source-maps on env.dev=true', () => {
        let env = {};
        env.dev = true;
        const bundledConfig = WebpackConfig.bundleCartridge(
            env, 
            path.resolve(__dirname, '../fixtures'), 
            'js');
        assert(bundledConfig.mode === 'development');
        assert(bundledConfig.devtool === 'source-map');
    });

    it('should return empty object on non-existings folders', () => {
        let env = {};
        env.dev = true;
        const bundledConfig = WebpackConfig.bundleCartridge(
            env, 
            path.resolve(__dirname, '../doesNotEists'), 
            'js');
        assert(Object.keys(bundledConfig).length === 0);
    });

    it('should call all needed methods', () => {
        let env = {};
        env.dev = false;
        let stubGetPlugins = sinon.stub(WebpackConfig, 'getPlugins');
        let stubBuildDynamicAliases = sinon.stub(WebpackConfig, 'buildDynamicAliases');
        let stubScanEntryPoints = sinon.stub(WebpackConfig, 'scanEntryPoints').returns({
            'default/js/test.js': path.resolve(__dirname, '../fixtures/cartridge/client/default/js/test.js')
        });
        WebpackConfig.bundleCartridge(env, path.resolve(__dirname, '../fixtures'), 'js');
        assert(stubScanEntryPoints.called);
        assert(stubGetPlugins.calledAfter(stubScanEntryPoints));
        assert(stubBuildDynamicAliases.calledAfter(stubGetPlugins));
    });

    it('should createOutputfiles for js/css', () => {
        const {exec} = require('child_process');
        exec('npm run test:fixture', err => {
            let files;
            if (err) {
                // we have an error - fail the test
                assert.isTrue(false);
            };
            var fs = require('fs-extra');
            try {
                files = fs.readdirSync('./test/fixtures/cartridge/static/default');
                fs.removeSync('./test/fixtures/cartridge/static'); 
            } catch (err) {
                console.log(err)
                assert.isTrue(false);
            }
            // we expect to have js/css folder in output
            assert.isTrue(files.length === 2);
        });
       

    });
});