import { flattenTextOnlyContentChunks } from '../../convertEvaluatedContentChunks.js';
import { EvaluatedStandardChat } from '../../reagent-noggin-shared/types/evaluated-variables';

export const createLlama3Prompt = ({
  systemPrompt,
  chatPrompt,
}: {
  systemPrompt: string;
  chatPrompt: EvaluatedStandardChat;
}) => {
  let promptTemplate = `<|begin_of_text|>`;

  // add system prompt
  promptTemplate += `<|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}\n\n<|eot_id|>`;

  let inputEndsWithAssistantTurn = false;
  for (const chatTurn of chatPrompt) {
    promptTemplate += `<|start_header_id|>${
      chatTurn.speaker
    }<|end_header_id|>\n\n${flattenTextOnlyContentChunks(chatTurn.content)}`;
    inputEndsWithAssistantTurn = chatTurn.speaker === 'assistant';
  }

  if (!inputEndsWithAssistantTurn) {
    promptTemplate += `<|start_header_id|>assistant<|end_header_id|>\n\n`;
  }

  return promptTemplate;
};
