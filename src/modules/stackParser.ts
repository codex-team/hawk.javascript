import ErrorStackParser, {StackFrame} from 'error-stack-parser';

/**
 * Parse Error stack string and return useful information about an Error
 * @see https://github.com/stacktracejs/error-stack-parser
 */
export default function parseStack(error: Error): StackFrame[] {
  return ErrorStackParser.parse(error);
}
