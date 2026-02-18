# Caraid AI Chatbot - Project TODO

## Database & Schema
- [x] Create conversations table to store chat sessions per user
- [x] Create messages table to store individual messages with sender type (user/assistant)
- [x] Add indexes for efficient querying by user and conversation

## Backend API Endpoints
- [x] Create conversation CRUD procedures (list, create, get, delete)
- [x] Create message send procedure with LLM integration
- [x] Create message retry procedure to regenerate last assistant response
- [ ] Implement streaming response support for real-time message display
- [x] Add message history retrieval for conversation context

## AI Personality System
- [x] Define Caraid system prompt with personality traits (sarcastic, funny, caring, concise)
- [x] Add anti-roleplay rules to system prompt (no asterisk actions)
- [x] Implement social cue detection logic in system prompt
- [x] Add response length constraints to system prompt
- [ ] Test personality consistency across different conversation types

## Frontend Chat Interface
- [x] Design chat layout with message display area and input field
- [x] Implement message list component with user/assistant message styling
- [x] Create chat input component with send button
- [x] Add new conversation button and conversation list sidebar
- [ ] Implement real-time message streaming display
- [x] Add retry button for regenerating last assistant response
- [x] Add loading states during message generation

## Frontend Features
- [x] Implement conversation switching functionality
- [x] Add delete conversation feature
- [x] Display conversation history in sidebar
- [ ] Show message timestamps
- [x] Add empty state for new conversations
- [x] Implement auto-scroll to latest message

## LLM Integration
- [x] Set up LLM invocation with custom system prompt
- [ ] Implement streaming response handling
- [ ] Add error handling for LLM failures
- [ ] Test response quality and personality consistency

## Testing & Polish
- [x] Write vitest tests for conversation procedures
- [x] Write vitest tests for message procedures
- [x] Write vitest tests for retry functionality
- [ ] Test anti-roleplay enforcement
- [ ] Test social cue detection
- [ ] Manual testing of full chat flow
- [ ] Test message streaming display
- [ ] Verify conversation persistence

## Deployment
- [ ] Create checkpoint for initial release
