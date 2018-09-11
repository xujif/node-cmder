import 'mocha';

import assert from 'assert';

import { Types } from '../command';

const { parseArgumentSinagure, parseOptionSignature } = Types

describe('option', () => {

    it('parse option: boolean', async () => {
        const v1 = parseOptionSignature('--V|version')
        assert(!v1.isArray, 'should not be array')
        assert(v1.isOptional, 'should be optianal')
        assert(v1.isBoolean, 'should be boolean')
        assert.equal(v1.name, 'version', 'option name')
        assert.equal(v1.flag, 'V', 'option flag')
    });
    it('parse option: required', async () => {
        const v1 = parseOptionSignature('--queue=  : queue name')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(!v1.isOptional, 'should not be optianal')
        assert(!v1.isBoolean, 'should not be boolean')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'option name')
        assert(!v1.flag, 'option has no flag')
    });
    it('parse option: optional', async () => {
        const v1 = parseOptionSignature('--queue?=  : queue name')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert(!v1.isBoolean, 'should not be boolean')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'option name')
        assert(!v1.flag, 'option has no flag')
    });
    it('parse option: with default value', async () => {
        const v1 = parseOptionSignature('--name=joe : default is joe')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'default is joe', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert(!v1.isBoolean, 'should not be boolean')
        assert.equal(v1.default, 'joe', 'has default')
        assert.equal(v1.name, 'name', 'option name')
    });
    it('parse option: with default value(with blank)', async () => {
        const v1 = parseOptionSignature('--name="joe green" : default is "joe green"')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'default is "joe green"', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert(!v1.isBoolean, 'should not be boolean')
        assert.equal(v1.default, 'joe green', 'has default')
        assert.equal(v1.name, 'name', 'option name')
    });
});

describe('argument', () => {

    it('parse argument: required', async () => {
        const v1 = parseArgumentSinagure('queue=  : queue name')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(!v1.isOptional, 'should not be optianal')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'argument name')
    });
    it('parse argument: compatible with laravel signature 1', async () => {
        const v1 = parseArgumentSinagure('queue?  : queue name')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(v1.isOptional, 'should be optianal')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'argument name')
    });
    it('parse argument: compatible with laravel signature 2', async () => {
        const v1 = parseArgumentSinagure('queue?*  : queue name')
        assert(v1.isArray, 'should be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(v1.isOptional, 'should be optianal')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'argument name')
    });
    it('parse argument: optional', async () => {
        const v1 = parseArgumentSinagure('--queue?=  : queue name')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'queue name', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert(!v1.default, 'no default')
        assert.equal(v1.name, 'queue', 'argument name')
    });
    it('parse argument: with default value', async () => {
        const v1 = parseArgumentSinagure('--name=joe : default is joe')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'default is joe', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert.equal(v1.default, 'joe', 'has default')
        assert.equal(v1.name, 'name', 'argument name')
    });
    it('parse argument: with default value(with blank)', async () => {
        const v1 = parseArgumentSinagure('--name="joe green" : default is "joe green"')
        assert(!v1.isArray, 'should not be array')
        assert.equal(v1.description, 'default is "joe green"', 'should with description')
        assert(v1.isOptional, 'should  be optianal')
        assert.equal(v1.default, 'joe green', 'has default')
        assert.equal(v1.name, 'name', 'argument name')
    });
});
