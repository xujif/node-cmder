import { BaseCommand, DefineCommand } from '../command';

@DefineCommand({
  signature: 'test {--test} a test command',
  factory: () => {
    return new TestAA
  }
})
export class TestAA extends BaseCommand {
  handle() {
    console.log(this.option('test'))
  }
}

