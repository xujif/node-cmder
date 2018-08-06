### Command line tools for Node.js & Typescript
two ways to define a cli command:  
- js object
- with decorators

## Usage
more usages are in src/tests.ts
```Typescript
import { ConsoleManager,Option,Arguments,Command } from '.'

const manager = new ConsoleManager()
// define a cli with decorators
class TestOption {
    @Option( { flag:'n' })
    name: string
    @Arguments()
    who: string
}
@Command({
    name: 'test'
})
class TestCommand {
    constructor(protected param: TestOption) {

    }

    handle () {
        console.log(this.param)
    }
}
// add a command with class
manager.addClassCommand(TestCommand)

const cmd = {
    name: 'test2',
    options: [
        {
            name: 'name',
            type: String,
            description: 'name'
        }, {
            name: 'who',
            isArg: true,
            description: 'witch one can be choose'
        }
    ],
    handle: (param: any) => {
        console.log(param)
    }
}
manager.addCommand(cmd)
manager.execute()
// usage :
// node entry.js test who --name name
```
### API
```Typescript
// command class definition
export interface CommandInterface {
    handle (): number | void | Promise<Number> | Promise<void>
}
export type ConsoleCommandClass = { new(opt: any): CommandInterface } & Function
// manager 
export class ConsoleManager {
    /**
     * add a class command
     *
     * @param {ConsoleCommandClass} cls
     * @memberof ConsoleManager
     */
    addClassCommand (cls: ConsoleCommandClass): this
    /**
     * add a commond
     *
     * @param {ConsoleCommand} cmd
     * @memberof ConsoleManager
     */
    addCommand (cmd: ConsoleCommand): this 
    /**
     * excute with argv (default: process.argv.slice(2))
     *
     * @param {*} [argv=process.argv.slice(2)]
     * @returns
     * @memberof ConsoleManager
     */
    execute (argv = process.argv.slice(2)): number|void|Promise<number|void>
}

// command definition
export interface ConsoleCommand {
    name: string
    description?: string
    options?: OptionDefinition[]
    withoutHelp?: boolean
    handle: (param: any) => void | number | Promise<void | number>
}

// Option definition
export interface OptionDefinition {
    name: string
    flag?: string
    optional?: boolean
    description?: string
    default?: string | boolean | number
    isArray?: boolean
    isArg?: boolean                          
    prop?: string
    type?: NumberConstructor | StringConstructor | BooleanConstructor
}
```