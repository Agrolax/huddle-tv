import {BedrockAI} from './bedrock.js';
import {MockAI} from './mock.js';
import type {HouseholdAI} from './types.js';

export type {ChatContext, ChatTurn, HouseholdAI, Person, TonightContext} from './types.js';
export {BedrockAI} from './bedrock.js';
export {MockAI, mockAnswer, mockTonight} from './mock.js';

/**
 * `HUDDLE_AI=bedrock` uses Amazon Nova; anything else (the default) is the mock,
 * so the demo runs without an AWS account.
 */
export function createAI(env: NodeJS.ProcessEnv = process.env): HouseholdAI {
  if (env.HUDDLE_AI === 'bedrock') {
    return new BedrockAI({
      region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? 'us-east-1',
      ...(env.HUDDLE_TONIGHT_MODEL ? {tonightModel: env.HUDDLE_TONIGHT_MODEL} : {}),
      ...(env.HUDDLE_CHAT_MODEL ? {chatModel: env.HUDDLE_CHAT_MODEL} : {}),
    });
  }
  return new MockAI();
}
