import colors from 'colors/safe';
import Debug from 'debug';
import glob from 'glob';
import path, { basename } from 'path';

import { CommandOption } from './decractors';

export const SymbolExecuteParams = Symbol.for('cmder:execute_params')
export const SymbolMeta = Symbol.for('cmder:meta')

const debug = Debug('node-cmder')

function strWidth(s: string, w: number) {
  return s + ' '.repeat(w - s.length)
}

function protectedBrace(s: string) {
  return s.replace('{{', '%7b').replace('}}', '%7d')
}
function transBrace(s: string) {
  return s.replace('%7b', '{').replace('%7d', '}')
}

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

export interface ArgumentDefinition {
  name: string
  default?: any
  description?: string
  isOptional?: boolean
  isArray?: boolean
  transform?: (v: any) => any,
}

export interface OptionDefinition extends ArgumentDefinition {
  flag?: string
  isBoolean?: boolean
  callback?: (v: any, options: Object) => void
}

export const defaultArgDef = {
  description: '',
  isOptional: false,
  isArray: false,
}

export const defaultOptionDef = {
  description: '',
  isOptional: false,
  isArray: false,
  isBoolean: false,
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
export function parseArgumentSinagure(signature: string) {
  signature = protectedBrace(signature)
  if (/^\{.+\}$/.test(signature)) {
    signature = signature.substring(1, signature.length - 1)
  }
  const opt = Object.assign({}, defaultArgDef) as ArgumentDefinition
  let [exp, ...rest] = signature.split(' : ')
  if (/\*|\?/.test(exp) && exp.indexOf('=') === -1) {
    exp = exp.trim().replace(/^([a-z][-\w]+)(\?)?(\*)?$/, "$1$2=$3")
  }
  opt.description = transBrace(rest.join(' : '))
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
export function parseOptionSignature(signature: string) {
  signature = protectedBrace(signature)

  if (/$\{.+\}^/.test(signature)) {
    signature = signature.substring(1, signature.length - 1)
  }
  const [exp, ...rest] = signature.split(' : ')
  const m = exp.trim().match(/--([-\w|]+)(\?)?(=.*)?/)
  if (!m) {
    throw new DefinationError('Unable to determine option name from signature: ' + signature)
  }
  const opt = Object.assign({}, defaultOptionDef) as OptionDefinition
  opt.description = transBrace(rest.join(' : '))
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

export interface ExecuteParams {
  args: any
  options: any
}

export type Action = (args: ExecuteParams) => any

export abstract class BaseCommand {
  name: string = ''
  description: string = ''
  version = '0.0.0'
  options = {} as { [k: string]: OptionDefinition }
  args = {} as { [k: string]: ArgumentDefinition }
  abstract run(argv: string[]): any
  abstract getHelpText(): string

  setName(name: string) {
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
  setVersion(version: string, signature = '--V|version') {
    this.version = version
    this.addOption(signature, {
      callback: (v) => {
        if (v) {
          process.stdout.write(this.version + '\n')
          process.exit(0)
        }
      }
    })
    return this
  }


  /**
   * print help text with process.stdout
   *
   * @returns
   * @memberof GroupCommand
   */
  printHelp() {
    process.stdout.write(this.getHelpText())
  }


  /**
   *  add an option definition with signature
   *
   * @param {string} signature
   * @param {Partial<OptionDefinition>} [part]
   * @returns
   * @memberof GroupCommand
   */
  addOption(signature: string, part?: Partial<OptionDefinition>): this

  /**
   * add option definition without signature
   *
   * @param {OptionDefinition} def
   * @returns {this}
   * @memberof BaseCommand
   */
  addOption(def: OptionDefinition): this
  addOption(...params: any[]) {
    const d = typeof params[0] === 'string' ? parseOptionSignature(params[0]) : Object.assign({}, defaultOptionDef, params[0])
    if (params.length > 1) {
      Object.assign(d, params[1])
    }
    const keys = ['--' + d.name]
    if (d.flag) {
      keys.push('-' + d.flag)
    }
    for (let k of keys) {
      if (this.options[k]) {
        throw new DefinationError('duplicate option: ' + k)
      }
      this.options[k] = d
    }
    return this
  }

  /**
   * merge option meta
   *
   * @param {string} name
   * @param {Partial<OptionDefinition>} [part]
   * @returns
   * @memberof Command
   */
  mergeOption(name: string, part?: Partial<OptionDefinition>) {
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
  async execute(argv = process.argv.slice(2)) {
    debug('command execute', argv)
    try {
      const ret = await this.run(argv)
      process.exit(+ret || 0)
    } catch (e) {
      if (e instanceof ExecuteError) {
        const message = `${colors.red('Error:')}\n  ${colors.white(e.message)}`
          + `\n\n${colors.yellow('Help:')}\n  use --help for more information\n`
        process.stderr.write(message)
        process.exit(e.exitCode)
      } else {
        const message = `${colors.red('Exception Occurred:')}\n\n  ${colors.yellow(e)}\n`
        process.stderr.write(message)
        process.exit(-1)
      }
    }
  }


  protected processArgs(argsRaw: string[]) {
    const args = {} as any
    const defs = Object.keys(this.args).map(k => this.args[k])
    for (let d of defs) {
      if (d.isArray) {
        if (!d.isOptional && argsRaw.length === 0 && !d.default) {
          throw new ExecuteError(`argument <${d.name} ...> need values`)
        } else {
          const v = argsRaw.length > 0 ? argsRaw : d.default
          args[d.name] = d.transform ? d.transform(v) : v
        }
      } else {
        const v = argsRaw.shift() || d.default
        if (!v && !d.isOptional) {
          throw new ExecuteError(`argument <${d.name}> need a value`)
        }
        args[d.name] = d.transform ? d.transform(v) : v
      }
    }
    return args
  }

  protected processOptions(optionsRaw: any) {
    const options = {} as any
    Object.keys(this.options)
      .filter(s => /^--/.test(s))
      .map(s => this.options[s])
      .forEach(d => {
        if (typeof optionsRaw[d.name] === 'undefined' && !d.isOptional) {
          const sn = d.flag ? `-${d.flag}, --${d.name}` : `--${d.name}`
          throw new ExecuteError('require option: ' + sn)
        }
        const transform = d.transform || function (v) { return v }
        const value = transform(typeof optionsRaw[d.name] !== 'undefined' ? optionsRaw[d.name] : d.default)
        options[d.name] = value
        if (d.callback) {
          d.callback(value, options)
        }
      })
    return options
  }
}

export class Command extends BaseCommand {
  protected _action !: Action
  constructor(signature?: string | Action)
  constructor(signature?: string, action?: Action)
  constructor(signature?: string | Action, action?: Action) {
    super()
    if (typeof signature === 'string') {
      this.parseSignature(signature)
    } else if (typeof signature === 'function') {
      this._action = signature
    }
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
   * @param {Action} func
   * @memberof Command
   */
  setAction(func: Action): this {
    this._action = func
    return this
  }

  run(argv: string[]) {
    if (!this._action) {
      throw new DefinationError('no action defined')
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
   * @param {Partial<ArgumentDefinition>} [part]
   * @returns
   * @memberof Command
   */
  addArg(signature: string, part?: Partial<ArgumentDefinition>): this
  addArg(def: ArgumentDefinition): this
  addArg(...params: any[]) {
    const d = typeof params[0] === 'string' ? parseArgumentSinagure(params[0]) : Object.assign({}, defaultArgDef, params[0])
    if (params.length > 1) {
      Object.assign(d, params[1])
    }
    const args = Object.keys(this.args).map(k => this.args[k])
    if (args.filter(d => d.isOptional || d.isArray).length > 0) {
      throw new DefinationError('array or optianal argument must be last')
    }
    if (this.args[d.name]) {
      throw new DefinationError('duplicate args: ' + d.name)
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
  getHelpText() {
    const args = Object.keys(this.args).map(k => this.args[k])
    const options = Object.keys(this.options)
      .filter(s => /^--/.test(s)).map(s => this.options[s])
    const argsSignature = args.map(d => {
      let s = d.isOptional ? '[' + d.name + ']' : '<' + d.name + '>'
      if (d.isArray) {
        s += ' [' + d.name + ' ...]'
      }
      return s
    }).join(' ')
    const optionsSinature = options.length > 0 ? '[options]' : ''
    let help = colors.yellow('Usage:\n');
    help += ' '.repeat(6) + `${this.name || 'command'} ${optionsSinature} ${argsSignature}`
    if (args.length > 0) {
      const argsHelps = args.map(d => {
        let s = d.isArray ? d.name + ' ...' : d.name
        let left = d.isOptional ? '[' + s + ']' : '<' + s + '>'
        return '  ' + strWidth(left, 30) + d.description
      }).join('\n')
      help += `\n\n${colors.yellow('Arguments:')}\n${argsHelps}`
    }
    if (options.length > 0) {
      const optionsHelp = options.map(d => {
        let left = d.flag ? `${' '.repeat(2)}-${d.flag}, --${d.name}` : `${' '.repeat(6)}--${d.name}`
        if (!d.isBoolean && typeof d.default !== 'undefined') {
          left += '[=' + d.default + ']'
        }
        return strWidth(left, 30) + d.description
      }).join('\n')
      help += `\n\n${colors.yellow('Options:')}\n${optionsHelp}`
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
  removeHelpOption() {
    delete this.options['--help']
    return this
  }

  /**
   * custom help text
   *
   * @param {(string | ((origin: string) => string))} s
   * @param {string} [option='--help']
   * @memberof Command
   */
  customHelp(s: string | ((origin: string) => string), option = '--help') {
    this.removeHelpOption()
      .addOption(`${option} : print this help message`, {
        callback: (v) => {
          if (v) {
            process.stdout.write(typeof s === 'string' ? s : s.call(this, this.getHelpText()))
            process.stdout.write('\n')
            process.exit(0)
          }
        }
      })
    return this
  }

  protected parseSignature(signature: string) {
    signature = protectedBrace(signature)
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
      this.description = transBrace(rest)
    }
    return this
  }

  protected parseArgv(argv: string[]) {
    const optionsRaw = {} as any
    const argsRaw: string[] = []
    for (let s = argv.shift(); s; s = argv.shift()) {
      if (s[0] === '-') {
        const [name, _value] = s.split('=')
        const d = this.options[name]
        if (!d) {
          throw new ExecuteError('unknown option: ' + s)
        }
        if (!d.isArray && optionsRaw[d.name]) {
          throw new ExecuteError('duplicate option provided:  ' + s)
        }
        if (d.isBoolean) {
          optionsRaw[d.name] = true
          continue
        } else {
          const value = _value ? _value : argv.shift()
          if (!value) {
            throw new ExecuteError(`option ${s} need value`)
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

  addCommands(arr: Command[]) {
    for (let c of arr) {
      this.addCommand(c)
    }
    return this
  }
  /**
   * add a sub commond with Command instance or creator
   *
   * @param {(BaseCommand | (() => BaseCommand))} v
   * @returns {this}
   * @memberof GroupCommand
   */
  addCommand(v: BaseCommand | ((g: GroupCommand) => BaseCommand)): this

  /**
   * add a commond with signature
   *
   * @param {string} v
   * @param {Action} action
   * @returns {this}
   * @memberof GroupCommand
   */
  addCommand(v: string, action: Action): this
  addCommand(v: string | BaseCommand | ((g: GroupCommand) => BaseCommand), action?: Action): this {
    let command!: BaseCommand
    if (typeof v === 'string') {
      command = new Command(v, action)
    } else if (typeof v === 'function') {
      command = v(this)
    } else if (v instanceof BaseCommand) {
      command = v
    } else {
      throw new DefinationError('unsupport value')
    }
    if (!command.name) {
      throw new DefinationError('command should has name when binding to GroupCommand')
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
  getHelpText() {
    const options = Object.keys(this.options)
      .filter(s => /^--/.test(s)).map(s => this.options[s])

    const optionsSinature = options.length > 0 ? '[options]' : ''
    let help = colors.yellow('Usage:\n');
    help += ' '.repeat(6) + `node ${this.name} ${optionsSinature} <command> [args...] [command options]`
    if (options.length > 0) {
      const optionsHelp = options.map(d => {
        let left = d.flag ? `${' '.repeat(2)}-${d.flag}, --${d.name}` : `${' '.repeat(6)}--${d.name}`
        if (!d.isBoolean && typeof d.default !== 'undefined') {
          left += '[=' + d.default + ']'
        }
        return strWidth(left, 30) + d.description
      }).join('\n')
      help += `\n\n${colors.yellow('Options:')}\n${optionsHelp}`
    }
    const commandsHelp = Object.keys(this.commands)
      .map(k => this.commands[k])
      .map(c => ' '.repeat(6) + this.getSubCommondDescription(c))
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
  run(argv: string[]) {
    const raw = this.parseArgvUntilCommand(argv)
    debug('parseArgvUntilCommand', raw)
    this.processOptions(raw.options)
    if (raw.args.length === 0) {
      throw new ExecuteError('no commond provided')
    }
    const sub = raw.args[0]
    debug('call sub command', sub)
    const command = this.commands[sub]
    if (!command) {
      throw new ExecuteError(`commond "${sub}" is not defined`)
    }
    return command.run(raw.restArgv)
  }

  scanCommands(patthern: string): this {
    const matches = glob.sync(patthern)
    for (let f of matches) {
      const file = path.resolve(f)
      const m = require(file)
      const types = Object.values(m)
        .filter(t => typeof t === 'function' && (Reflect as any).hasMetadata(SymbolMeta, t))
      for (let t of types) {
        this.addCommand(this.meta2Command(t as any, (Reflect as any).getMetadata(SymbolMeta, t)))
      }
    }
    return this
  }

  /**
   * return commond description for group commond
   *
   * @returns
   * @memberof Command
   */
  protected getSubCommondDescription(c: BaseCommand) {
    return colors.green(strWidth(c.name || '<no name>', 24)) + c.description
  }

  protected meta2Command(t: Function, meta: CommandOption) {
    return new Command(meta.signature, (arg) => {
      const instance = meta.factory ? meta.factory() : Reflect.construct(t, [])
      instance[SymbolExecuteParams] = arg
      return instance.handle()
    })
  }

  protected parseArgvUntilCommand(argv: string[]) {
    const optionsRaw = {} as any
    const argsRaw: string[] = []
    for (let s = argv.shift(); s; s = argv.shift()) {
      if (s[0] === '-') {
        const [name, _value] = s.split('=')
        const d = this.options[name]
        if (!d) {
          throw new ExecuteError('unknown option: ' + s)
        }
        if (!d.isArray && optionsRaw[d.name]) {
          throw new ExecuteError('duplicate option provided:  ' + s)
        }
        if (d.isBoolean) {
          optionsRaw[d.name] = true
          continue
        } else {
          const value = _value ? _value : argv.shift()
          if (!value) {
            throw new ExecuteError('no value with option: ' + s)
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

