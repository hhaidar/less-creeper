#!/usr/bin/env node

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var program = require('commander');
var watch = require('nodewatch');
var colors = require('colors');
var less = require('less');

// Setup commander
program
    .version('0.0.1')
    .usage('[options] <less files>')
    .option('-c, --compress', 'Enable minification')
    .parse(process.argv);

// Let's go
if (program.args.length > 0) {
    console.log('Creepin\' your LESS...'.magenta);
}

var directories = [];
var files = [];

// Setup file and directory stuffs
_.each(program.args, function(file) {
    // Let's get the absolute path
    file = path.resolve(file);
    // Does the file exist?
    path.exists(file, function(exists) {
        if (exists) {
            var directory = path.dirname(file);
            // Is the directory already being tracked?
            if (!_.include(directories, directory)) {
                watch.add(directory, true);
                directories.push(directory);
                console.log('Watching '.cyan + directory.bold);
            }
            files.push(file);
            return;
        }
        // Warn the user that the file wasn't found
        console.log('Warning '.yellow + file.bold + ' doesn\'t exist');
    });
});

// Directory watch
watch.onChange(function(file, prev, curr, action) {
    // Skipping over non-less files
    if (path.extname(file) !== '.less') {
        return;
    }
    console.log('Recompiling...'.cyan);
    // Time to parse our tracked LESS files
    _.each(files, function(file) {
        fs.readFile(file, 'utf-8', function(err, data) {
            // We can't access the file for some reason
            if (err) {
                console.error('Error '.red + 'Could not open file: %s', err);
                return;
            }
            var parser = new(less.Parser)({
                paths: [path.dirname(file)],
                filename: file
            });
            parser.parse(data, function (err, tree) {
                // LESS parser error
                if (err) {
                    console.log('\nLESS Error\n'.red);
                    less.writeError(err);
                    return;
                }
                try {
                    var css = tree.toCSS({
			// TODO: Maybe make sure this is always bool?
                        compress: program.compress
                    });
                    // Create .css filename from the LESS file
                    var filename = path.dirname(file) 
                        + '/' 
                        + path.basename(file, '.less') + '.css';
                    // Did the parser actually give us CSS to write?
                    if (css) {
                        fs.writeFile(filename, css, function(err) {
                            // Oh shit, write error
                            if (err) {
                                console.log('Save Error '.red +  err);
                                return;
                            }
                            // Yay we saved!
                            console.log('Saved '.green + filename.bold);
                        });
                    }
                } catch (e) {
                    console.log('\nLESS Error\n'.red);
                    less.writeError(e);
                }
            });
        });
    });
});
