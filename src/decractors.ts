import 'reflect-metadata';

import { ExecuteParams, SymbolExecuteParams, SymbolMeta } from './types';

export abstract class BaseCommand {

  protected [SymbolExecuteParams]: ExecuteParams
  /**
   * get execute arg
   *
   * @param {string} name
   * @returns
   * @memberof BaseCommand
   */
  arg(name: string) {
    return this[SymbolExecuteParams].args[name]
  }

  /**
   * get execute option
   *
   * @param {string} name
   * @returns
   * @memberof BaseCommand
   */
  option(name: string) {
    return this[SymbolExecuteParams].options[name]
  }

  abstract handle(): any
}

export interface CommandOption {
  signature: string
  factory?: () => any
}

export function DefineCommand(signature: string | CommandOption) {
  return function (target: typeof BaseCommand) {
    const opt = typeof signature === 'string' ? { signature } : signature
    return Reflect.defineMetadata(SymbolMeta, opt, target)
  }
}

