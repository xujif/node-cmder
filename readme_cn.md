### 命令行生成器，（兼容 node.js & typescript)
灵感来自于 [laravel](https://laravel.com/docs/5.7/artisan) artisan commond.

<a href="#case">说明与示例</a>  
<a href="#api">API</a>  
<a href="#signture">Sinagure说明</a>

### <a name="case">说明与示例：</a>  
1.  通过builder定义一个命令
    ```Typescript
    import * as cmder from 'node-cmder'
    const signature = '{name} {--bool-flag} {--A|age=10} description'
    cmder.buildCommand(signature,({ args, options }) => {
        console.log(args, options)
    })
    .execute()
    ```
2.  通过构造函数一个命令  
    ```Typescript
    import * as cmder from 'node-cmder'
    const signature = '{name} {--bool-flag} {--A|age=10} description'
    const cmd = new cmder.Command(signature)
    cmd.setAction(({ args, options }) => {
            console.log(args, options)
        })
        .execute()
    ```
3. 定义子命令
    ```Typescript
    import * as cmder from 'node-cmder'
    cmder.buildGroupCommand()
        .addCommand('test1',({ args, options }) => {
            console.log(args, options)
        })
        .addCommand('test2',({ args, options }) => {
            console.log(args, options)
        })
        .execute()
    ```
    ```bash
    node bin.js --help
    ```


4. 通过装饰器定义
    ```Typescript
    // src/tests/test.ts
    import { BaseCommand, DefineCommand } from '..';

    @DefineCommand('test {--test} a test command')
    export class Test extends BaseCommand {
        handle() {
            console.log(this.option('test'))
        }
    }

    // src/bin.ts
    import * as cmder from '.';
    cmder.buildGroupCommand()
         .scanCommands('./dist/test/**.js')  // glob pattern 
         .execute()

    ```


### <a href="#api">API</a>  
#### Builder
- `.buildCommand(signature: string, action?: Types.Action | undefined): Command;`
- `.buildGroupCommand(): GroupCommand;` 
### Command & GroupCommand
- `.run(argv:string[])` 运行命令，与 `.execute` 不同点:  
    - `.run` 不会处理任何异常，也不支持交互
    - `.execute` 处理异常并在控制台打印相关信息

- `.printHelp()` 打印错误信息
- `.getHelpText()` 获取错误文本
- `.addOption()` 增加选项
- `.addArg()` 增加arg
- `.mergeOption(name,opt)` 覆盖选项的设置

### Signture 格式：
<a name="signature"></a>
### commond signature
```commond {arg1} {arg2} {arg3*} {--O|option} description```
- 不需要组织命令的时候 command 可以省略
- arg 数组或者 可选的 arg 必须是最后一个
- 选项的缩写和名字不允许重复

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
#### Option 转换 (transform) 与 回调 (callback)
`.mergeOption('age',{transform:parseInt})` transform age to int   
`.mergeOption('age',{callback:(v)=>console.log(v)})` option callback

#### 特殊的选项
- `---help` 帮助选项默认打开. 
通过调用 `.removeHelpOption()` 关闭或者使用 `.customHelp()` 来自定义.
- `---V|version` 版本选项默认没有，通过 `.setVersion(v:string)` 会自动创建.