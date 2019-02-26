[中文文档](readme_cn.md)


### Command line tools for Node.js & Typescript
easily generate your command with a string signature. 
  - signature is compatible with [laravel](https://laravel.com/docs/5.7/artisan) artisan commond.
### ***v3.3.x is not compatible with v2.x.x***

## Example signature
`command {arg1} {arg2 : arg2} {--bool-flag} {--A|age=10} description` 

Example:
```Typescript
import { CommandBuilder } from 'node-cmder'

const signature = '{name} {--bool-flag} {--A|age=10} commanddescription'

CommandBuilder.command(signature)
  .setAction(({ args, options }) => {
    console.log(args, options)
  })
  .execute()
```
then run it
```bash
$ node test.js --help  
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
### Argument parsing  

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
- `---help` enable by default, generate help automately. call `.removeHelpOption()` to disable it or call `.customHelp()` to customize.
- `---V|version`  disable by default. call `.setVersion(v:string)` to enable.

### Execute command
`.execute (argv = process.argv.slice(2))` execute the commond with console.  
Note: **process will exit automately when action return**  
return "never resolve Promise" to prevent:  
`return KeepRunning()` KeepRunning is exported by node-cmder
or return an never resolved Promise like `new Promise(()=>{/**/})`   


## Api
### Builder
- `.command(signature: string, action?: Types.Action | undefined): Command;`
build a simple commond
- `.groupCommand(): GroupCommand;` 
build a group commond with can add sub commonds
### Command & GroupCommand
- `.run(argv:string[])` run the command. different from `.execute`:  
    - `.run` does not handle any Error,suitable for being called by program
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