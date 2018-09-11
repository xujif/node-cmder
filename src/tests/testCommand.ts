import 'mocha';

import assert from 'assert';

import { Command, GroupCommand } from '../command';

describe('command', () => {
    it('check define meta', async () => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        assert.equal(c.name, 'test')
        assert.equal(c.description, 'command description')
        assert.equal(c.args['name'].name, 'name')
        assert.equal(c.args['name'].isArray, false)
        assert.equal(c.args['name'].isOptional, false)
        assert.equal(c.options['--bool'].name, 'bool')
        assert.equal(c.options['--bool'].isOptional, true)
        assert.equal(c.options['--bool'].isBoolean, true)
        assert.equal(c.options['--age'].name, 'age')
        assert.equal(c.options['--age'].isOptional, true)
        assert.equal(c.options['--age'].isBoolean, false)
        assert.equal(c.options['--age'].default, 10)
        assert.equal(c.options['-A'].name, 'age')
        assert.equal(c.options['-A'].isOptional, true)
        assert.equal(c.options['-A'].isBoolean, false)
        assert.equal(c.options['-A'].default, 10)
        assert.equal(c.options['--tags'].name, 'tags')
        assert.equal(c.options['--tags'].isOptional, true)
        assert.equal(c.options['--tags'].isBoolean, false)
        assert.equal(c.options['--tags'].isArray, true)
        assert.equal(c.options['--tags'].default.length, 0)
    });
    it('call command', async (done) => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        c.action((o) => {
            assert.equal(o.args.name, 'joe')
            assert.equal(o.options.bool, false)
            assert.strictEqual(o.options.age, '20')
            assert(Array.isArray(o.options.tags))
            done()
        })
        c.execute(['joe', '-A', '20'])
    })
    it('call command 2', async (done) => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        c.action((o) => {
            assert.strictEqual(o.args.name, 'joe')
            assert.strictEqual(o.options.bool, false)
            assert.strictEqual(o.options.age, '20')
            assert(Array.isArray(o.options.tags))
            assert.equal(o.options.tags[0], 'tag1')
            assert.equal(o.options.tags[1], 'tag2')
            done()
        })
        c.execute(['joe', '-A', '20', '--tags', 'tag1', '--tags', 'tag2'])
    })
    it('test option merge and transform', async (done) => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        c.mergeOption('age', { transform: parseInt })
        c.action((o) => {
            assert.strictEqual(o.args.name, 'joe')
            assert.strictEqual(o.options.bool, false)
            assert.strictEqual(o.options.age, 20)
            assert(Array.isArray(o.options.tags))
            assert.strictEqual(o.options.tags[0], 'tag1')
            assert.strictEqual(o.options.tags[1], 'tag2')
            done()
        })
        c.execute(['joe', '-A', '20.11', '--tags', 'tag1', '--tags', 'tag2'])
    })
    it('test option merge and option callback', async (done) => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        let v = 1
        c.mergeOption('age', {
            transform: parseInt,
            callback: (value) => {
                v = value
            }
        })
        assert.strictEqual(v, 1, 'value = 1 before execute')
        c.action((o) => {
            assert.strictEqual(o.args.name, 'joe')
            assert.strictEqual(o.options.bool, false)
            assert.strictEqual(o.options.age, 20)
            assert(Array.isArray(o.options.tags))
            assert.strictEqual(o.options.tags[0], 'tag1')
            assert.strictEqual(o.options.tags[1], 'tag2')
            assert.strictEqual(v, 20, 'value = 20 after execute')
            done()
        })
        c.execute(['joe', '-A', '20.11', '--tags', 'tag1', '--tags', 'tag2'])
    })
    it('test option merge and option validate', async (done) => {
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        c.mergeOption('age', {
            transform: parseInt,
            validate: (value) => {
                if (value > 10) {
                    throw new Error('age should less then 10')
                }
            }
        })
        c.action((o) => {
            assert.fail('should not access')
            done()
        })
        try {
            c.execute(['joe', '-A', '20.11', '--tags', 'tag1', '--tags', 'tag2'])
        } catch (e) {
            assert.equal(e.message, 'age should less then 10')
            done()
        }
    })
});

describe('group command', () => {
    it('add sub command', async (done) => {
        const group = new GroupCommand()
        const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
        group.addCommand(c)
        c.action((o) => {
            assert.equal(o.args.name, 'joe')
            assert.equal(o.options.bool, false)
            assert.strictEqual(o.options.age, '20')
            assert(Array.isArray(o.options.tags))
            done()
        })
        group.execute(['test', 'joe', '-A', '20'])
    });
    it('add sub command by singnature', async (done) => {
        const group = new GroupCommand()
        const c = new Command()
        group.addCommand('test {name} {--bool} {--A|age=10} {--tags?=*} command description', (o) => {
            assert.equal(o.args.name, 'joe')
            assert.equal(o.options.bool, false)
            assert.strictEqual(o.options.age, '20')
            assert(Array.isArray(o.options.tags))
            done()
        })
        group.execute(['test', 'joe', '-A', '20'])
    });
});

