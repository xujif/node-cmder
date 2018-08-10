import 'reflect-metadata';

import { ConsoleCommand, DefinationError, OptionDefinition } from './types';


export interface CommandInterface {
    handle (): any
}

const SYMBOL_OPTION_META = Symbol.for(require('../package.json').name + 'cli:option-meta')
const SYMBOL_FLAG = Symbol.for(require('../package.json').name + 'cli:flag')

export type ConsoleCommandClass = { new(opt: any): CommandInterface } & Function



/**
 * define a console command
 *
 * @export
 * @param {(Pick<ConsoleCommand, 'name' | 'description' | 'withoutHelp'>)} opt
 * @returns
 */
export function Command (opt: Pick<ConsoleCommand, 'name' | 'description' | 'withoutHelp'>) {
    return function (target: ConsoleCommandClass) {
        const cmd: Partial<ConsoleCommand> = {
            name: opt.name,
            description: opt.description,
            withoutHelp: opt.withoutHelp,
        }
        const params = Reflect.getMetadata('design:paramtypes', target) as Function[]
        if (params.length > 1) {
            throw new DefinationError('cli command only support 1 construct arguemnts or none')
        } else if (params.length === 1) {
            cmd.options = getDecoratorOptionDefinitionArr(params[0])
        } else {
            cmd.options = []
        }
        Reflect.defineMetadata(SYMBOL_FLAG, cmd, target)
    }
}

/**
 *
 *
 * @export
 * @param {ConsoleCommandClass} target
 * @returns
 */
export function getConsoleCommandMeta (target: ConsoleCommandClass) {
    return Reflect.getMetadata(SYMBOL_FLAG, target) as Pick<ConsoleCommand,
        'name' | 'description' | 'withoutHelp' | 'options'>
}

export interface DecoratorOptionDefinition extends OptionDefinition {
    prop: string
}

/**
 * define a comsole option
 *
 * @export
 * @param {(Pick<Partial<DecoratorOptionDefinition>, 'name' | 'flag' | 'optional' | 'description' | 'type'>)} [opt]
 * @returns
 */
export function Option (opt?: Pick<Partial<DecoratorOptionDefinition>, 'name' | 'flag' | 'optional' | 'description' | 'type'>) {
    return function (target: any, prop: string) {
        opt = opt || {}
        const isArray = Reflect.getMetadata('design:type', target, prop) === Array
        getDecoratorOptionDefinitionArr(target.constructor).push({
            name: opt.name || prop,
            flag: opt.flag,
            prop: prop,
            optional: opt.optional,
            type: opt.type || (isArray ? String : Reflect.getMetadata('design:type', target, prop)),
            description: opt.description,
            isArray: isArray,
            isArg: false
        })
    }
}

/**
 * define command arguments
 *
 * @export
 * @param {(Pick<Partial<DecoratorOptionDefinition>, 'optional' | 'description' | 'type'>)} [opt]
 * @returns
 */
export function Arguments (opt?: Pick<Partial<DecoratorOptionDefinition>, 'optional' | 'description' | 'type'>) {
    return function (target: any, prop: string) {
        opt = opt || {}
        getDecoratorOptionDefinitionArr(target.constructor).push({
            name: prop,
            prop: prop,
            optional: opt.optional,
            type: opt.type || Reflect.getMetadata('design:type', target, prop),
            description: opt.description,
            isArray: Reflect.getMetadata('design:type', target, prop) === Array,
            isArg: true
        })
    }
}

/**
 * inner function, get decorators of class
 *
 * @export
 * @param {Function} target
 * @returns
 */
export function getDecoratorOptionDefinitionArr (target: Function) {
    let arr = Reflect.getMetadata(SYMBOL_OPTION_META, target) as DecoratorOptionDefinition[]
    if (!arr) {
        arr = []
        Reflect.defineMetadata(SYMBOL_OPTION_META, arr, target)
    }
    return arr
}