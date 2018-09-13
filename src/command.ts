import colors from 'colors/safe';
import Debug from 'debug';
import { basename } from 'path';

const debug = Debug('node-cmder')

function strWidth (s: string, w: number) {
    return s + ' '.repeat(w - s.length)
}

export namespace Types {
    export class DefinationError extends Error {
        CODE = 'ERR_COMMAND_DEFINATION_ERROR'
    }
    export class ExecuteError extends Error {
        CODE = 'ERR_COMMAND_EXECUTE_ERROR'
        exitCode!: number
        constructor(message: string, exitCode: number = -1) {
            super(message)
            this.exitCode = exitCode
        }
    }

    export class ArgumentDefinition {
        name!: string
        default?: any
        description: string = ''
        isOptional = false
        isArray = false
        transform (value: any) {
            return value
        }
        getSignatureName () {
            let s = this.isOptional ? '[' + this.name + ']' : '<' + this.name + '>'
            if (this.isArray) {
                s += ' [' + this.name + ' ...]'
            }
            return s
        }
        getHelp () {
            let s = this.isArray ? this.name + ' ...' : this.name
            let left = this.isOptional ? '[' + s + ']' : '<' + s + '>'
            return strWidth(left, 30) + this.description
        }
    }

    export class OptionDefinition extends ArgumentDefinition {
        flag?: string
        isBoolean = false
        callback?: (v: any) => void
        getSignatureName () {
            return this.flag ? `-${this.flag}, --${this.name}` : '--' + this.name
        }
        getHelp () {
            let left = this.getSignatureName()
            if (!this.isBoolean && typeof this.default !== 'undefined') {
                left += '[=' + this.default + ']'
            }
            return strWidth(left, 30) + this.description
        }
    }

    /**
     * argument sinature should be:
     * compatible with laravel signature:
     *      name*  : description
     *      name?  : description
     *      name?* : description
     * version?=  : description
     * version=  : description
     * array=*  
     * has-defaut=value
     */
    export function parseArgumentSinagure (signature: string) {
        if (/$\{.+\}^/.test(signature)) {
            signature = signature.substring(1, signature.length - 1)
        }
        const opt = new ArgumentDefinition()
        // compatible with laravel signature
        let [exp, ...rest] = signature.split(' : ')
        if (/\*|\?/.test(exp) && exp.indexOf('=') === -1) {
            exp = exp.trim().replace(/^([a-z][-\w]+)(\?)?(\*)?$/, "$1$2=$3")
        }
        opt.description = rest.join(' : ')
        const m = exp.trim().match(/^([a-z][-\w]+)(\?)?(=.+)?/i)
        if (!m) {
            throw new DefinationError('Unable to determine argument name from signature: ' + signature)
        }
        opt.name = m[1]
        opt.isOptional = m[2] === '?'
        if (m[3]) {
            const valueExp = m[3].replace(/^=/, '')
            if (valueExp === '*') {
                opt.isArray = true
            } else if (valueExp.length > 1) {
                opt.isOptional = true
                opt.default = valueExp.indexOf(' ') > -1 ? valueExp.substring(1, valueExp.length - 1) : valueExp
            }
        }
        return opt
    }

    /**
     * option sinature should be:
     * --version=  : description
     * --V|version 
     * --array=*
     * --has-defaut=value
     *
     * @export
     * @param {string} signature
     * @returns
     */
    export function parseOptionSignature (signature: string) {
        if (/$\{.+\}^/.test(signature)) {
            signature = signature.substring(1, signature.length - 1)
        }
        const [exp, ...rest] = signature.split(' : ')
        const m = exp.trim().match(/--([-\w|]+)(\?)?(=.*)?/)
        if (!m) {
            throw new DefinationError('Unable to determine option name from signature: ' + signature)
        }
        const opt = new OptionDefinition()
        opt.description = rest.join(' : ')
        const [flag, name] = m[1].split(/\s*\|\s*/)
        if (name) {
            opt.name = name
            opt.flag = flag
        } else {
            opt.name = flag
        }
        if (!m[3]) {
            opt.isOptional = true
            opt.default = false
            opt.isBoolean = true
        } else {
            const valueExp = m[3].replace(/^=/, '')
            opt.isOptional = m[2] === '?'
            if (valueExp === '*') {
                opt.isArray = true
                opt.default = []
            } else if (valueExp.length > 1) {
                opt.isOptional = true
                opt.default = valueExp.indexOf(' ') > -1 ? valueExp.substring(1, valueExp.length - 1) : valueExp
            }
        }
        return opt
    }
    export type Action = (opt: { args: any, options: any }) => any
}

/**
 * keep the command run
 *
 * @export
 * @returns
 */
export function KeepRuning () {
    return new Promise(() => {
        debug('keep running')
    })
}

export abstract class BaseCommand {
    name: string = ''
    description: string = ''
    version = '0.0.0'
    options = {} as { [k: string]: Types.OptionDefinition }

    abstract run (argv: string[]): any
    abstract getHelpText (): string

    setName (name: string) {
        this.name = name
    }

    /**
     * add version option
     *
     * @param {string} version
     * @param {string} [signature='--V|version']
     * @returns
     * @memberof Command
     */
    setVersion (version: string, signature = '--V|version') {
        this.version = version
        this.addOption(signature, {
            callback: (v) => {
                if (v) {
                    console.log(this.version)
                    process.exit(0)
                }
            }
        })
        return this
    }


    /**
     * print help text with console.log
     *
     * @returns
     * @memberof GroupCommand
     */
    printHelp () {
        console.log(this.getHelpText())
    }


    /**
     *  add an option definition with signature
     *
     * @param {string} signature
     * @param {Partial<Types.OptionDefinition>} [part]
     * @returns
     * @memberof GroupCommand
     */
    addOption (signature: string, part?: Partial<Types.OptionDefinition>) {
        const d = Object.assign(Types.parseOptionSignature(signature), part)
        const keys = ['--' + d.name]
        if (d.flag) {
            keys.push('-' + d.flag)
        }
        for (let k of keys) {
            if (this.options[k]) {
                throw new Types.DefinationError('duplicate option: ' + k)
            }
            this.options[k] = d
        }
        return this
    }

    /**
     * merge option meta
     *
     * @param {string} name
     * @param {Partial<Types.OptionDefinition>} [part]
     * @returns
     * @memberof Command
     */
    mergeOption (name: string, part?: Partial<Types.OptionDefinition>) {
        if (this.options['--' + name]) {
            Object.assign(this.options['--' + name], part)
        }
        return this
    }


    /**
     * execute command
     *
     * @param {*} [argv=process.argv.slice(2)]
     * @returns
     * @memberof Command
     */
    async execute (argv = process.argv.slice(2)) {
        debug('command execute', argv)
        try {
            const ret = await this.run(argv)
            process.exit(+ret || 0)
        } catch (e) {
            if (e instanceof Types.ExecuteError) {
                const message = `${colors.red('Error:')}\n  ${colors.white(e.message)}`
                    + `\n\n${colors.yellow('Help:')}\n  use --help for more information`
                console.log(message)
                process.exit(e.exitCode)
            } else {
                const message = `${colors.red('Exception Occurred:')}\n\n  ${colors.yellow(e)}`
                console.log(message)
                process.exit(-1)
            }
        }
    }

    protected processOptions (optionsRaw: any) {
        const options = {} as any
        Object.keys(this.options)
            .filter(s => /^--/.test(s))
            .map(s => this.options[s])
            .forEach(d => {
                const v = optionsRaw[d.name]
                if (!d.isBoolean && !v && !d.isOptional && !d.default) {
                    throw new Types.ExecuteError('require option: ' + d.getSignatureName())
                }
                const value = v || d.default
                options[d.name] = d.transform(value)
                if (d.callback) {
                    d.callback(options[d.name])
                }
            })
        return options
    }
}

export class Command extends BaseCommand {
    protected args = {} as { [k: string]: Types.ArgumentDefinition }
    protected _action !: Types.Action
    protected _customHelp?: false | string | ((origin: string) => string) = false
    protected _customHelpOption = '--help'

    constructor(signature: string = 'command', action?: Types.Action) {
        super()
        this.parseSignature(signature)
        if (action) {
            this._action = action
        }
        this.addOption('--help : print this help message', {
            callback: (v) => {
                if (v) {
                    this.printHelp()
                    process.exit(0)
                }
            }
        })
    }



    /**
     * set the commond action
     *
     * @param {Types.Action} func
     * @memberof Command
     */
    setAction (func: Types.Action): this {
        this._action = func
        return this
    }

    run (argv: string[]) {
        if (!this._action) {
            throw new Types.DefinationError('no action defined')
        }
        const raw = this.parseArgv(argv)
        debug('parseArgv', raw)
        const options = this.processOptions(raw.options)
        debug('processOptions', options)
        const args = this.processArgs(raw.args)
        debug('processArgs', args)
        return this._action({ args, options })
    }




    /**
     * add an argument definition
     *
     * @param {string} signature
     * @param {Partial<Types.ArgumentDefinition>} [part]
     * @returns
     * @memberof Command
     */
    addArg (signature: string, part?: Partial<Types.ArgumentDefinition>) {
        const d = Object.assign(Types.parseArgumentSinagure(signature))
        const args = Object.keys(this.args).map(k => this.args[k])
        if (args.filter(d => d.isOptional || d.isArray).length > 0) {
            throw new Types.DefinationError('array or optianal argument must be last')
        }
        if (this.args[d.name]) {
            throw new Types.DefinationError('duplicate args: ' + d.name)
        }
        this.args[d.name] = d
        return this
    }


    /**
     * get help text but not print
     *
     * @returns
     * @memberof GroupCommand
     */
    getHelpText () {
        const args = Object.keys(this.args).map(k => this.args[k])
        const options = Object.keys(this.options)
            .filter(s => /^--/.test(s)).map(s => this.options[s])
        const argsSignature = args.map(d => d.getSignatureName()).join(' ')
        const optionsSinature = options.length > 0 ? '[options]' : ''
        let help = `${colors.yellow('Usage:')}\n  ${this.name || 'command'} ${optionsSinature} ${argsSignature}`
        if (args.length > 0) {
            const argsHelps = args.map(d => '  ' + d.getHelp()).join('\n')
            help += `\n\n${colors.yellow('Arguments:')}\n${argsHelps}`
        }
        if (options.length > 0) {
            const optionsHelp = options.map(d => '  ' + d.getHelp()).join('\n')
            help += `\n\n${colors.yellow('options:')}\n${optionsHelp}`
        }
        if (this.description) {
            help += `\n\n${colors.yellow('Description:')}\n  ${this.description}`
        }
        return help + '\n'
    }

    /**
     * remove default --help option 
     *
     * @memberof Command
     */
    removeHelpOption () {
        this._customHelp = false
        return this
    }

    /**
     * custom help text
     *
     * @param {(string | ((origin: string) => string))} s
     * @param {string} [option='--help']
     * @memberof Command
     */
    customHelp (s: string | ((origin: string) => string), option = '--help') {
        this._customHelp = s
        this._customHelpOption = '--help'
        return this
    }

    protected parseSignature (signature: string) {
        const nameMatch = signature.match(/^\s*([a-z][-a-z0-9:_]+)/i)
        if (nameMatch) {
            this.name = nameMatch[1]
        }
        const matches = signature.match(/\{\s*[^}]+\s*}/g) || []
        for (let s of matches) {
            const exp = s.substring(1, s.length - 1)
            if (exp[0] === '-') {
                this.addOption(exp)
            } else {
                this.addArg(exp)
            }
        }

        const rest = signature.replace(/^\s*([a-z][-a-z0-9:_]+)/i, '')
            .replace(/\{\s*[^}]+\s*}/g, '')
            .trim()
        if (rest.length > 0) {
            this.description = rest
        }
        return this
    }

    protected parseArgv (argv: string[]) {
        const optionsRaw = {} as any
        const argsRaw: string[] = []
        for (let s = argv.shift(); s; s = argv.shift()) {
            if (s[0] === '-') {
                const [name, _value] = s.split('=')
                const d = this.options[name]
                if (!d) {
                    throw new Types.ExecuteError('unknown option: ' + s)
                }
                if (!d.isArray && optionsRaw[d.name]) {
                    throw new Types.ExecuteError('duplicate option provided:  ' + s)
                }
                if (d.isBoolean) {
                    optionsRaw[d.name] = true
                    continue
                } else {
                    const value = _value ? _value : argv.shift()
                    if (!value) {
                        throw new Types.ExecuteError(`option ${s} need value`)
                    }
                    if (d.isArray) {
                        optionsRaw[d.name] = optionsRaw[d.name] || []
                        optionsRaw[d.name].push(value)
                    } else {
                        optionsRaw[d.name] = value
                    }
                }
            } else {
                argsRaw.push(s)
            }
        }
        return {
            options: optionsRaw,
            args: argsRaw
        }
    }

    protected processArgs (argsRaw: string[]) {
        const args = {} as any
        const defs = Object.keys(this.args).map(k => this.args[k])
        for (let d of defs) {
            if (d.isArray) {
                if (!d.isOptional && argsRaw.length === 0) {
                    throw new Types.ExecuteError(`argument <${d.name} ...> need values`)
                } else {
                    args[d.name] = d.transform(argsRaw)
                }
            } else {
                const v = argsRaw.shift() || d.default
                if (!v && !d.isOptional) {
                    throw new Types.ExecuteError(`argument <${d.name}> need a value`)
                }
                args[d.name] = d.transform(v)
            }
        }
        return args
    }
}



export class GroupCommand extends BaseCommand {
    name: string = basename(process.argv[1])
    protected commands = {} as { [k: string]: BaseCommand }

    constructor() {
        super()
        this.addOption('--help : get this help message', {
            callback: (v) => {
                if (v) {
                    this.printHelp()
                    process.exit(0)
                }
            }
        })
    }
    /**
     * add a sub commond with Command instance or creator
     *
     * @param {(BaseCommand | (() => BaseCommand))} v
     * @returns {this}
     * @memberof GroupCommand
     */
    addCommand (v: BaseCommand | ((g: GroupCommand) => BaseCommand)): this

    /**
     * add a commond with signature
     *
     * @param {string} v
     * @param {Types.Action} action
     * @returns {this}
     * @memberof GroupCommand
     */
    addCommand (v: string, action: Types.Action): this
    addCommand (v: string | BaseCommand | ((g: GroupCommand) => BaseCommand), action?: Types.Action): this {
        let command!: BaseCommand
        if (typeof v === 'string') {
            command = new Command(v, action)
        } else if (typeof v === 'function') {
            command = v(this)
        } else if (v instanceof BaseCommand) {
            command = v
        } else {
            throw new Types.DefinationError('unsupport value')
        }
        if (!command.name) {
            throw new Types.DefinationError('command should has name when binding to GroupCommand')
        }
        this.commands[command.name] = command
        return this
    }



    /**
     * get help text but not print
     *
     * @returns
     * @memberof GroupCommand
     */
    getHelpText () {
        const options = Object.keys(this.options)
            .filter(s => /^--/.test(s)).map(s => this.options[s])

        const optionsSinature = options.length > 0 ? '[options]' : ''
        let help = `${colors.yellow('Usage:')}\n node ${this.name} ${optionsSinature} <command> [args...] [command options]`
        if (options.length > 0) {
            const optionsHelp = options.map(d => '  ' + d.getHelp()).join('\n')
            help += `\n\n${colors.yellow('options:')}\n${optionsHelp}`
        }
        const commandsHelp = Object.keys(this.commands)
            .map(k => this.commands[k])
            .map(c => '  ' + this.getSubCommondDescription(c))
            .join('\n')
        return help + `\n\n${colors.yellow('Available commands:')}\n${commandsHelp}\n`
    }


    /**
     * execute command
     *
     * @param {string[]} argv
     * @returns
     * @memberof GroupCommand
     */
    run (argv: string[]) {
        const raw = this.parseArgvUntilCommand(argv)
        debug('parseArgvUntilCommand', raw)
        this.processOptions(raw.options)
        if (raw.args.length === 0) {
            throw new Types.ExecuteError('no commond provided')
        }
        const sub = raw.args[0]
        debug('call sub command', sub)
        const command = this.commands[sub]
        if (!command) {
            throw new Types.ExecuteError(`commond "${sub}" is not defined`)
        }
        return command.run(raw.restArgv)
    }

    /**
     * return commond description for group commond
     *
     * @returns
     * @memberof Command
     */
    protected getSubCommondDescription (c: BaseCommand) {
        return colors.green(strWidth(c.name || '<no name>', 30)) + c.description
    }

    protected parseArgvUntilCommand (argv: string[]) {
        const optionsRaw = {} as any
        const argsRaw: string[] = []
        for (let s = argv.shift(); s; s = argv.shift()) {
            if (s[0] === '-') {
                const [name, _value] = s.split('=')
                const d = this.options[name]
                if (!d) {
                    throw new Types.ExecuteError('unknown option: ' + s)
                }
                if (!d.isArray && optionsRaw[d.name]) {
                    throw new Types.ExecuteError('duplicate option provided:  ' + s)
                }
                if (d.isBoolean) {
                    optionsRaw[d.name] = true
                    continue
                } else {
                    const value = _value ? _value : argv.shift()
                    if (!value) {
                        throw new Types.ExecuteError('no value with option: ' + s)
                    }
                    if (d.isArray) {
                        optionsRaw[d.name] = optionsRaw[d.name] || []
                        optionsRaw[d.name].push(value)
                    } else {
                        optionsRaw[d.name] = value
                    }
                }
            } else {
                argsRaw.push(s)
                break
            }
        }
        return {
            options: optionsRaw,
            args: argsRaw,
            restArgv: argv
        }
    }
}

export const CommandBuilder = {
    command (signature: string, action?: Types.Action) {
        return new Command(signature, action)
    },
    groupCommand () {
        return new GroupCommand()
    }
}



