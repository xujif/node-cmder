import * as Types from './types';

export { GroupCommand, Command, ExecuteError, DefinationError } from './types';
export { DefineCommand, BaseCommand } from './decractors';

/**
 * build a Command
 * signature example: `command {arg1} {--O|option=10 : option desc} description` 
 * @export
 * @param {(string | Types.Action)} [signature]
 * @returns {Command}
 */
export function buildCommand(signature?: string | Types.Action): Types.Command
export function buildCommand(signature?: string, action?: Types.Action): Types.Command
export function buildCommand(signature?: string | Types.Action, action?: Types.Action) {
  return new Types.Command(signature as string, action)
}
/**
 * build a GroupCommand
 *
 * @export
 * @returns
 */
export function buildGroupCommand(): Types.GroupCommand {
  return new Types.GroupCommand()
}
/**
 * keep the command run
 * it will return a never resolve promise
 *
 * @export
 * @returns
 */
export function KeepRuning() {
  return new Promise((r, j) => {
    function keep() {
      setTimeout(() => keep(), 2147483647)
    }
    keep()
  })
}
