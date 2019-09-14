import 'mocha';

import assert from 'assert';

import { Command, GroupCommand } from '../src';

describe('command', () => {
  it('check defines', () => {
    const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
    c.addOption({
      name: 'ext'
    })
    assert.equal(c.name, 'test')
    assert.equal(c.description, 'command description')
    const args = (c as any).args
    const options = (c as any).options
    assert.equal(args['name'].name, 'name')
    assert.equal(args['name'].isArray, false, 'name args should not be array')
    assert.equal(args['name'].isOptional, false)
    assert.equal(options['--bool'].name, 'bool')
    assert.equal(options['--bool'].isOptional, true)
    assert.equal(options['--bool'].isBoolean, true)
    assert.equal(options['--age'].name, 'age')
    assert.equal(options['--age'].isOptional, true)
    assert.equal(options['--age'].isBoolean, false)
    assert.equal(options['--age'].default, 10)
    assert.equal(options['-A'].name, 'age')
    assert.equal(options['-A'].isOptional, true)
    assert.equal(options['-A'].isBoolean, false)
    assert.equal(options['-A'].default, 10)
    assert.equal(options['--ext'].name, 'ext')
    assert.equal(options['--ext'].isOptional, false)
    assert.equal(options['--ext'].isBoolean, false)
    assert.equal(options['--ext'].default, undefined)
    assert.equal(options['--tags'].name, 'tags')
    assert.equal(options['--tags'].isOptional, true)
    assert.equal(options['--tags'].isBoolean, false)
    assert.equal(options['--tags'].isArray, true)
    assert.equal(options['--tags'].default.length, 0)
  });
  it('call command', async (done) => {
    const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
    c.setAction((o) => {
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
    c.setAction((o) => {
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
  it('call command 3', async (done) => {
    const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
    c.setAction((o) => {
      assert.strictEqual(o.args.name, 'joe')
      assert.strictEqual(o.options.bool, false)
      assert.strictEqual(o.options.age, '20')
      assert(Array.isArray(o.options.tags))
      assert.equal(o.options.tags[0], 'tag1')
      assert.equal(o.options.tags[1], 'tag2')
      done()
    })
    c.execute(['joe', '-A=20', '--tags=tag1', '--tags=tag2'])
  })
  it('test option merge and transform', async (done) => {
    const c = new Command('test {name} {--bool} {--A|age=10} {--tags?=*} command description')
    c.mergeOption('age', { transform: parseInt })
    c.setAction((o) => {
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
    c.setAction((o) => {
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
      callback: (value) => {
        if (value > 10) {
          throw new Error('age should less then 10')
        }
      }
    })
    c.setAction((o) => {
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
    c.setAction((o) => {
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
