


export class DefinationError extends Error {
    CODE = 'ERR_CONOSLE_DEFINATION_ERROR'
}


export class ExecuteError extends Error {
    CODE = 'ERR_CONOSLE_EXECUTE_ERROR'
    exitCode!: number
    constructor(message: string, exitCode: number = -1) {
        super(message)
        this.exitCode = exitCode
    }
}

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

export interface ConsoleCommand {
    name: string
    description?: string
    handle: (param: any) => void | number | Promise<void | number>
    options?: OptionDefinition[]
    withoutHelp?: boolean
}

export class ConsoleParams {
    readonly options: { [k: string]: string | boolean | string[] }
    readonly args: string[]
    readonly raw: string[]
    constructor(raw: string[]) {
        this.raw = raw
        const ret = this.parseArgv(raw)
        this.args = ret.args
        this.options = ret.options
    }


    getOption (name: string) {
        return this.options[name]
    }

    getOptionAsArray (name: string): string[] {
        const v = this.options[name]
        if (typeof (v as any) === 'undefined') {
            return []
        }
        return Array.isArray(v) ? v : [v.toString()]
    }

    get arg0 () {
        return this.args.length > 0 ? this.args[0] : undefined
    }

    protected parseArgv (raw: string[]) {
        const argv = Object.assign([] as string[], raw)
        // first step parse argv
        const args = [] as string[]
        while (argv.length > 0 && argv[0][0] !== '-') {
            args.push(argv.shift()!)
        }
        const options = {} as any
        while (argv.length > 0) {
            const n = argv.shift() as string
            if (n[0] !== '-') {
                args.push(n)
                continue
            }
            let name!: string
            let value!: string | boolean
            if (n.indexOf('=') > 0) {
                const arr = n.split(/=/)
                name = arr[0]
                value = arr[1]
            } else {
                name = n
                if (argv.length > 0 && argv[0][0] !== '-') {
                    // has value
                    value = argv.shift() as string
                } else {
                    value = true
                }
            }
            if (options[name]) {
                if (Array.isArray(options[name])) {
                    options[name].push(value)
                } else if (options[name] === true || value === true) {
                    throw new Error(`option [${name}] require value, if it's an bool flag shuld not assign twice`)
                } else {
                    options[name] = [options[name], value]
                }
            } else {
                options[name] = value
            }
        }
        return {
            args, options
        }
    }
}