import colors from 'colors/safe';
import Debug from 'debug';
import glob from 'glob';
import util from 'util';

import { CommandInterface, ConsoleCommandClass, getConsoleCommandMeta } from './decorators';
import { ConsoleCommand, ConsoleParams, DefinationError, ExecuteError, OptionDefinition } from './types';

const _debug = Debug('console')
export const DefaultOptions: OptionDefinition[] = [
    {
        name: 'help',
        flag: 'h',
        type: Boolean,
        description: 'show command help'
    }
]
export abstract class Executor {
    name: string
    description: string
    options: OptionDefinition[]
    abstract execute (argv: string[]): undefined | void | number | Promise<void | number>
    showHelp (): void {
        const argOptions = this.options.filter(o => o.isArg)
        let help = `${colors.yellow('Usage:')}\n  ${this.name} command `
        if (argOptions.length > 0) {
            const names = argOptions.map(o => o.optional ? `[${o.name}]` : `<${o.name}>`).join(' ')
            help += `${names} [...options]\n\n`
            help += `${colors.yellow('Arguments:')}\n${this.renderArgumentsHelp(argOptions)}\n\n`
        } else {
            help += '[...options]\n\n'
        }
        help += `${colors.yellow('Options:')}\n${this.renderOptionHelp()}`
        console.log(help)
    }

    protected transformParam (param: ConsoleParams) {
        const ret = {} as any
        for (let o of this.options) {
            let v !: any[]
            if (o.isArg) {
                v = param.args
            } else {
                const fv = o.flag ? (param.getOptionAsArray(`-${o.flag}`) || []) : []
                const vv = param.getOptionAsArray(`--${o.name}`) || []
                v = fv.concat(vv)
            }
            if (o.type && (o.type as any) !== Array) {
                v = v.map(o.type as any)
            }
            if (!o.optional && v.length === 0) {
                if (o.isArg) {
                    throw new ExecuteError(`argument: <${o.name}> is required\n`)
                } else {
                    throw new ExecuteError(`option: --${o.name} is required\n`)
                }
            }
            const prop = o.prop || o.name
            ret[prop] = o.isArray ? v : v[0]
        }
        return ret
    }


    protected renderOptionHelp () {
        const width = 30
        return this.options.filter(o => !o.isArg).concat(DefaultOptions).map(o => {
            let s = '  '
            if (o.flag) {
                s += `-${o.flag}, `
            }
            s += `--${o.name} `
            if (o.type !== Boolean) {
                s += '<value>'
            }
            if (s.length < width) {
                s += ' '.repeat(width - s.length)
            }
            s += (o.description || 'no description')
            if (!o.optional) {
                s += ' (required: true)'
            }
            if (o.isArray) {
                s += ' (complex)'
            }
            if (typeof o.default !== 'undefined') {
                s += ` (default: ${o.default})`
            }
            return s
        }).join('\n')
    }

    protected renderArgumentsHelp (options: OptionDefinition[]) {
        const width = 30
        return options.map(o => {
            let s = `  ${o.name}  `
            if (s.length < width) {
                s += ' '.repeat(width - s.length)
            }
            s += (o.description || 'no description')
            if (!o.optional) {
                s += ' (required:true)'
            }
            if (typeof o.default !== 'undefined') {
                s += ` (default: ${o.default})`
            }
            return s
        }).join('\n')
    }
}

export class CommandExecutor extends Executor {
    constructor(protected cmd: ConsoleCommand) {
        super()
        this.name = cmd.name
        this.description = cmd.description || 'no description'
        this.options = cmd.options || []
    }
    execute (argv: string[]) {
        const param = new ConsoleParams(argv)
        if (!this.cmd.withoutHelp && (param.options['-h'] || param.options['--help'])) {
            return this.showHelp()
        }
        try {
            const opt = this.transformParam(param)
            return this.cmd.handle(opt)
        } catch (e) {
            throw new DefinationError('Error:\n  ' + e.message)
        }
    }
}

export class GroupCommandExecutor extends Executor {
    protected cmdsMap = new Map<string, Executor>()
    constructor(protected cmd: Pick<ConsoleCommand, 'name' | 'options' | 'description'>) {
        super()
        this.name = cmd.name
        this.description = cmd.description || 'no description'
        this.options = cmd.options || []
    }
    addSubCommand (cmd: ConsoleCommand): void {
        const executor = new CommandExecutor(cmd)
        this.cmdsMap.set(executor.name, executor)
    }
    showHelp (): void {
        const help = `${colors.yellow('Usage:')}\n  ${this.name} command\n\n`
            + `${colors.yellow('Options:')}\n${this.renderOptionHelp()
            } \n\n`
            + `${colors.yellow('Available commands:')}\n${this.renderAvailableCommands()} `
        console.log(help)
    }
    execute (argv: string[]) {
        const sub = argv.shift()
        if (sub === '-h' || sub === '--help') {
            return this.showHelp()
        }
        if (!sub || !this.cmdsMap.has(sub)) {
            return this.showHelp()
        }
        const executor = this.cmdsMap.get(sub)!
        return executor.execute(argv)

    }
    protected renderAvailableCommands () {
        const arr = [] as string[]
        const keys = Array.from(this.cmdsMap.keys()).sort()
        for (let name of keys) {
            const executor = this.cmdsMap.get(name)!
            const width = 30
            let s = '  ' + name
            if (s.length < width) {
                s += ' '.repeat(width - s.length)
            }
            s += executor.description
            arr.push(s)
        }
        return arr.join('\n')
    }
}

export class ConsoleManager {
    protected subCommand = new GroupCommandExecutor({ name: '' })

    /**
     * add a class command
     *
     * @param {ConsoleCommandClass} cls
     * @memberof ConsoleManager
     */
    addClassCommand (cls: ConsoleCommandClass): this {
        const cmd = this.buildClassCommand(cls)
        this.subCommand.addSubCommand(cmd)
        return this
    }

    /**
     * add a commond
     *
     * @param {ConsoleCommand} cmd
     * @memberof ConsoleManager
     */
    addCommand (cmd: ConsoleCommand): this {
        this.subCommand.addSubCommand(cmd)
        return this
    }

    async loadFromFiles (path: string | string[]) {
        const arr = Array.isArray(path) ? path : [path]
        const g = util.promisify(glob.Glob)
        for (let p of arr) {
            const files = await g(p)
            for (let f of files) {
                const m = require(f)
                Object.keys(m).map(n => m[n])
                    .filter(c => typeof c === 'function')
                    .forEach(c => {
                        const meta = getConsoleCommandMeta(c)
                        if (meta) {
                            this.addClassCommand(c)
                        }
                    });
            }
        }
    }

    loadFromFilesSync (path: string | string[]) {
        const arr = Array.isArray(path) ? path : [path]
        for (let p of arr) {
            const files = glob.sync(p)
            for (let f of files) {
                const m = require(f)
                Object.keys(m).map(n => m[n])
                    .filter(c => typeof c === 'function')
                    .forEach(c => {
                        const meta = getConsoleCommandMeta(c)
                        if (meta) {
                            this.addClassCommand(c)
                        }
                    });
            }
        }
    }

    /**
     * excute with argv (default: process.argv.slice(2))
     *
     * @param {*} [argv=process.argv.slice(2)]
     * @returns
     * @memberof ConsoleManager
     */
    async  execute (argv = process.argv.slice(2)) {
        _debug('excute:', argv)
        try {
            await this.subCommand.execute(argv)
            process.exit(0)
        }
        catch (e) {
            if (e instanceof DefinationError) {
                console.log(colors.red(e.message))
                console.log(colors.yellow("Info:\n  use -h or --help option to get more info"))
                process.exit(-1)
            }
            if (e instanceof ExecuteError) {
                process.exit(e.exitCode)
            }
        }
    }

    protected buildClassCommand (cls: ConsoleCommandClass): ConsoleCommand {
        const meta = getConsoleCommandMeta(cls)
        if (!meta) {
            throw new DefinationError(`[${cls.name}] not a console command class`)
        }
        const cmd: ConsoleCommand = {
            name: meta.name,
            description: meta.description,
            withoutHelp: meta.withoutHelp,
            options: meta.options,
            handle: (param?: any) => {
                const paramtypes = Reflect.getMetadata('design:paramtypes', cls)
                if (paramtypes.length > 0) {
                    Object.setPrototypeOf(param, new paramtypes[0])
                }
                const obj = this.constructClassCommandInstance(cls, [param])
                return obj.handle.call(obj)
            }
        }
        return cmd
    }
    protected constructClassCommandInstance (cls: ConsoleCommandClass, params: any[]): CommandInterface {
        _debug('construct class command:', cls, params)
        return Reflect.construct(cls, params)
    }
}
