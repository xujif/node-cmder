### Command line tools for Node.js & Typescript
easily generate your command with a string signature. 
  - signature is compatible with [laravel](https://laravel.com/docs/5.7/artisan) artisan commond.



## Example signature
`command {arg1} {arg2 : arg2} {--bool-flag} {--A|age=10} description` 

Example:
```Typescript
// test.js
import { CommandBuilder } from 'node-cmder'

const signature = `{name} {--bool-flag} {--A|age=10} description`

CommandBuilder.command(signature)
  .setAction(({ args, options }) => {
    console.log(args, options)
  })
  .execute()
```
then run it
```bash
$ node test.js --help  
Usage:
  command [options] <name>

Arguments:
  <name>

options:
  --bool-flag                   
  -A, --age[=10]                

Description:
  description

$ node test.js joe --bool-flag -A 20

{ name: 'joe' } { 'bool-flag': true, age: '20' }
```

## Usage
### commond signature
```commond {arg1} {arg2} {arg3*} {--O|option} description```
- command name is omissible when not in group commond
- array arg or optional arg **must** be last arguemnt
- option shortcut or name can not duplicated

### Option parsing
```
{--bool}                     //  boolean option
{--bool : this is boolean}   //  option with description
{--B|bool}                   //  option with shortcut
{--version=}                 //  option need value (required)
{--version=10}               //  option with default value
{--version="has blank"}      //  option with default value contains blank
{--version?=}                //  option need value (optional)
{--tags=*}                   //  array option
{--tags?=*}                  //  array option (optional)

```
### argument parsing  

```
{arg}                        // arg
{arg : this is arg}          //  arg with description
{arg?}                       // optional arg
{arg*}                       // array arg
{version?=}                  //  option need value (optional)
{tags=*}                     //  array arg
{tags?=*}                    //  array arg (optional)
{arg=10}                     //  arg with default value
{arg="has blank"}            //  arg with default value contains blank

```
### Option transform and callback
`.mergeOption('age',{transform:parseInt})` transform age to int   
`.mergeOption('age',{callback:(v)=>console.log(v)})` option callback

### special option
- `---help` enable by default. show commond help. call `.removeHelpOption()` to disable it or call `.customHelp()` to customized it.
- `---V|version`  disable by default. call `.setVersion()` to enable.

## Api
### CommandBuilder
- `.command(signature: string, action?: Types.Action | undefined): Command;`
build a simple commond
- `.groupCommand(): GroupCommand;` 
build a group commond with can add sub commonds
### Command & GroupCommand
- `.execute (argv = process.argv.slice(2))` execute the commond with console.
- `.run(argv:string[])` run the command. different from `.execute`:  
    - `.run` does not handle any Error
    - `.execute` handle and print erros to terminal and exit process after action return.

- `.printHelp()` print the help with console.log  
- `.getHelpText()` get the help text
- `.addOption()` add the extra option 
- `.addArg()` add the extra argument (only Command)
- `.mergeOption(name,opt)` set option metas


- more api are in [Section Interfaces](#interfaces)

## Examples
### build command step by step
`.addArg` or `.addOption` method does not need `{`  `}` 
```Typescript
CommandBuilder.command('test {name : arg}')
    .addArg('name2')
    .addOption('--A|age')
    .setVersion('2.0.0')
    .setAction(({ args, options }) => {
        console.log(args, options)
    })
```
### customHelp
`.customHelp` accept 2 types argument
- `string` print the string instead origin help
- `function` print the ret of function and pass orgin help as first argument

```Typescript
CommandBuilder.command('test {name : arg}')
    .addArg('name2')
    .addOption('--A|age=')
    .setVersion('2.0.0')
    .customHelp((origin) => {
        return origin + `\nExample:\n node test.js joe name 2 -A=20`
    })
    .setAction(({ args, options }) => {
        console.log(args, options)
    })
    .execute()
```
### group commond
`.addCommand` accept a signature and action or commond instance
```Typescript
CommandBuilder.groupCommand()
    .addCommand('test1 {name : arg}', ({ args, options }) => {
        console.log(args, options)
    })
    .addCommand((g) => {
        return CommandBuilder.command('test2 {name : arg}')
            .setAction(({ args, options }) => {
                console.log(args, options)
            })
    })
    .execute()
```




### <a name="interfaces">Interfaces</a>
all types are difined in src/command.ts
```Typescript
class GroupCommand{
    /**
     * add a sub commond with Command instance or creator
     *
     * @param {(Command | (() => Command))} v
     * @returns {this}
     * @memberof GroupCommand
     */
    addCommand(v: Command | (() => Command)): this;
    /**
     * add a commond with signature
     *
     * @param {string} v
     * @param {Types.Action} action
     * @returns {this}
     * @memberof GroupCommand
     */
    addCommand(v: string, action: Types.Action): this;
    /**
     *  add an option definition with signature
     *
     * @param {string} signature
     * @param {Partial<Types.OptionDefinition>} [part]
     * @returns
     * @memberof GroupCommand
     */
    addOption(signature: string, part?: Partial<Types.OptionDefinition>): this;
    /**
     * get help text but not print
     *
     * @returns
     * @memberof GroupCommand
     */
    getHelpText(): string;
    /**
     * print help text with console.log
     *
     * @returns
     * @memberof GroupCommand
     */
    printHelp(): void;
    /**
     * execute the commond
     *
     * @param {*} [argv=process.argv.slice(2)]
     * @returns
     * @memberof GroupCommand
     */
    execute(argv?: string[]): any;

    /**
     * add version option
     *
     * @param {string} version
     * @param {string} [signature='--V|version']
     * @returns
     * @memberof Command
     */
   setVersion(version: string, signature?: string): this;

}
class Command{

    /**
     * add version option
     *
     * @param {string} version
     * @param {string} [signature='--V|version']
     * @returns
     * @memberof Command
     */
   setVersion(version: string, signature?: string): this;
    /**
     * set the commond action
     *
     * @param {Types.Action} func
     * @memberof Command
     */
    setAction(func: Types.Action): this;
    /**
     * execute
     *
     * @param {*} [argv=process.argv.slice(2)]
     * @returns
     * @memberof Command
     */
    execute(argv?: string[]): any;
    /**
     * add an option definition with signature
     *
     * @param {string} signature
     * @param {Partial<Types.OptionDefinition>} [part]
     * @returns
     * @memberof Command
     */
    addOption(signature: string, part?: Partial<Types.OptionDefinition>): this;
    /**
     * merge option meta
     *
     * @param {string} name
     * @param {Partial<Types.OptionDefinition>} [part]
     * @returns
     * @memberof Command
     */
    mergeOption(name: string, part?: Partial<Types.OptionDefinition>): this;
    /**
     * add an argument definition
     *
     * @param {string} signature
     * @param {Partial<Types.ArgumentDefinition>} [part]
     * @returns
     * @memberof Command
     */
    addArg(signature: string, part?: Partial<Types.ArgumentDefinition>): this;
    /**
     * get help text but not print
     *
     * @returns
     * @memberof GroupCommand
     */
    getHelpText(): string;
    /**
     * print help text with console.log
     *
     * @returns
     * @memberof GroupCommand
     */
    printHelp(): void;
    /**
     * remove default --help option
     *
     * @memberof Command
     */
    removeHelpOption(): this;
    /**
     * custom help text
     *
     * @param {(string | ((s: string) => string))} s
     * @param {string} [option='--help']
     * @memberof Command
     */
    customHelp(s: string | ((s: string) => string), option?: string): this;
}
```