import 'mocha';

import assert from 'assert';

import * as Console from '..';
import { CommandExecutor, GroupCommandExecutor } from '../console';
import { ConsoleParams } from '../types';

describe('console test', () => {
    it('test argv parse', async () => {
        const argv = 'aa -b1 --b2 -t tt1 -c cc -t tt2'.split(' ')
        const consoleParam = new ConsoleParams(argv)
        assert(Array.isArray(consoleParam.options['-t']), 'test options -tt should be array')
        assert(consoleParam.args.length === 1, 'test argv be array and has one item')
        assert(consoleParam.options['--b2'] === true, 'test options --b2 should be boolean true')
        assert(consoleParam.options['-b1'] === true, 'test options -b1 should be boolean true')
    });
    it('test command executor', (done) => {
        const cmd = {
            name: 'test',
            description: 'no description',
            options: [
                {
                    name: 'age',
                    required: true,
                    type: Number,
                    description: 'age'
                }, {
                    name: 'alias',
                    flag: 'a',
                    required: true,
                    type: String,
                    isArray: true,
                    description: 'alias'
                },
                {
                    name: 'name',
                    required: true,
                    type: String,
                    description: 'name'
                }, {
                    name: 'who',
                    isArg: true,
                    required: true,
                    description: 'witch one can be choose'
                }
            ],
            handle: (param: any) => {
                assert.strictEqual(param.who, 'foobar')
                assert.strictEqual(param.name, 'nick')
                assert.strictEqual(param.age, 10)
                assert(Array.isArray(param.alias) && param.alias.length === 4)
                done()
            }
        }
        const executor = new CommandExecutor(cmd)
        executor.execute('foobar --name nick --age 10 --alias a -a b --alias c -a d'.split(' '))
    })
    it('test group command executor', (done) => {
        const cmd = {
            name: 'test',
            description: 'no description',
            options: [
                {
                    name: 'age',
                    required: true,
                    type: Number,
                    description: 'age'
                }, {
                    name: 'alias',
                    flag: 'a',
                    required: true,
                    type: String,
                    isArray: true,
                    description: 'alias'
                },
                {
                    name: 'name',
                    required: true,
                    type: String,
                    description: 'name'
                }, {
                    name: 'who',
                    isArg: true,
                    required: true,
                    description: 'witch one can be choose'
                }
            ],
            handle: (param: any) => {
                assert.strictEqual(param.who, 'foobar')
                assert.strictEqual(param.name, 'nick')
                assert.strictEqual(param.age, 10)
                assert(Array.isArray(param.alias) && param.alias.length === 4)
                done()
            }
        }
        const executor = new GroupCommandExecutor({ name: '' })
        executor.addSubCommand(cmd)
        executor.execute('test foobar --name nick --age 10 --alias a -a b --alias c -a d'.split(' '))
    })
    it('test class command and decororators', (done) => {
        class TestOption {
            @Console.Option({
                flag: 'a'
            })
            alias?: Array<String>

            @Console.Option({ optional: true })
            optional?: string

            @Console.Option()
            age: number

            @Console.Option()
            name: string

            @Console.Arguments()
            who: string
        }


        @Console.Command({
            name: 'test'
        })
        class Test {

            constructor(protected param: TestOption) {

            }

            handle () {
                assert.strictEqual(this.param.who, 'foobar')
                assert.strictEqual(this.param.name, 'nick')
                assert.strictEqual(this.param.optional, undefined)
                assert.strictEqual(this.param.age, 10)
                assert.strictEqual(typeof this.param.age, 'number')
                assert(Array.isArray(this.param.alias) && this.param.alias.length === 4)
                done()
            }
        }
        const manager = new Console.ConsoleManager()
        manager.addClassCommand(Test)
        manager.execute('test foobar --name nick --age 10 --alias a -a b --alias c -a d'.split(' '))
    })
    it('test manager', (done) => {
        const manager = new Console.ConsoleManager()
        const cmd = {
            name: 'test',
            description: 'no description',
            options: [
                {
                    name: 'age',
                    required: true,
                    type: Number,
                    description: 'age'
                }, {
                    name: 'alias',
                    flag: 'a',
                    required: true,
                    type: String,
                    isArray: true,
                    description: 'alias'
                },
                {
                    name: 'name',
                    required: true,
                    type: String,
                    description: 'name'
                }, {
                    name: 'who',
                    isArg: true,
                    required: true,
                    description: 'witch one can be choose'
                }
            ],
            handle: (param: any) => {
                assert.strictEqual(param.who, 'foobar')
                assert.strictEqual(param.name, 'nick')
                assert.strictEqual(param.age, 10)
                assert(Array.isArray(param.alias) && param.alias.length === 4)
                done()
            }
        }
        manager.addCommand(cmd)
        manager.execute('test foobar --name nick --age 10 --alias a -a b --alias c -a d'.split(' '))
    })

});
