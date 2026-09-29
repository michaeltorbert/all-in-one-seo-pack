import { defineStore } from 'pinia'

export const useAiSchemaGeneratorStore = defineStore('AiSchemaGeneratorStore', {
	state : () => ({
		currentScreen : null,
		generating    : false,
		mode          : 'smart',
		userPrompt    : ''
	})
})