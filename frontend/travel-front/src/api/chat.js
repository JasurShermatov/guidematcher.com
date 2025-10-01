// src/api/chat.js
// Handles chat-related HTTP endpoints: conversations, messages, blocks, etc.
// All endpoints require authentication (token).
// IDs are integers (not UUIDs).
// For WebSockets: Connect to wss://yourdomain/ws/chat/{conversation_id}/?token={access_token}
// Use WebSocket in JS: const ws = new WebSocket(`wss://domain/ws/chat/${convId}/?token=${token}`);
// Handle events: ws.onmessage = (e) => { const data = JSON.parse(e.data); if (data.type === 'chat_message') { ... } };
// Send: ws.send(JSON.stringify({ type: 'chat_message', content: 'Hello' })); // Or typing, etc.
// Types: chat_message {content}, message_read {message_id}, message_action {message_id, action: 'delete_sender'/'delete_both'/'recover'}, typing {is_typing: bool}
// Incoming: chat_message, message_read, message_action, typing_indicator, user_online, user_offline
import api from './api';
export const getConversations = async (params) => {
    // GET /chat/conversations/
    // Query params: page (int optional), page_size (int optional, default 50, max 100)
    // Response: Paginated list { id (int), created_at, updated_at, other_user ( {id (uuid), email, first_name, last_name, full_name, avatar (file or null), avatar_url (string or null), bio, is_active} ), last_message (full message or null), unread_count (int) }
    // Auth: Required (token)
    return api.get('chat/conversations/', { params });
};
export const createConversation = async (data) => {
    // POST /chat/conversations/
    // Body fields for form (from StartConversationSerializer):
    // - user_email: string (required, email of other user)
    // - message: string (optional, initial message, max 5000, stripped)
    // Validation: User exists/active, not self, not blocked
    // Response: Created or existing { id (int), ... same as list }
    // Auth: Required (token)
    // Body: { user_id OR user_email, message? } — biz user_id yuboramiz
    // Body: { user_id OR user_email, message? }
    // user_id bo‘lsa email talab qilinmaydi
    return api.post('chat/conversations/', data);
};
export const getConversation = async (id) => {
    // GET /chat/conversations/{id}/
    // Path params: id (int)
    // Response: Details (same as list)
    // Auth: Required (token, participant)
    return api.get(`chat/conversations/${id}/`);
};
export const getMessages = async (conversationId, params) => {
    // GET /chat/conversations/{conversation_id}/messages/
    // Path params: conversation_id (int)
    // Query params: page, page_size (pagination)
    // Response: Paginated list { id (int), conversation (int), sender (user full), content (string), created_at, deleted_for (none/sender/both), deleted_at (datetime or null), is_read (bool), read_at (datetime or null), delete_status ( {is_deleted: bool, deleted_for, deleted_at, can_recover: bool, is_visible: bool} ), can_recover (bool), is_mine (bool) }
    // Auth: Required (token, participant)
    return api.get(`chat/conversations/${conversationId}/messages/`, { params });
};
export const createMessage = async (data) => {
    // POST /chat/messages/send/
    // Body fields (from MessageCreateSerializer):
    // - conversation: int (required)
    // - content: string (required, stripped, not empty, max 5000)
    // Validation: Participant, not blocked
    // Response: Created { id, conversation, sender (full), content, created_at, ... }
    // Auth: Required (token)
    // Note: Triggers WS event
    return api.post('chat/messages/send/', data);
};
export const messageAction = async (messageId, data) => {
    // POST /chat/messages/{message_id}/action/
    // Path params: message_id (int)
    // Body fields (from MessageActionSerializer):
    // - action: string (required, delete_sender/delete_both/recover)
    // Validation: Own message, recoverable if recover
    // Response: { status: success, message: string, message_data: full updated message }
    // Auth: Required (token, sender)
    // Note: Triggers WS event
    return api.post(`chat/messages/${messageId}/action/`, data);
};
export const markMessagesRead = async (conversationId) => {
    // POST /chat/conversations/{conversation_id}/mark-read/
    // Path params: conversation_id (int)
    // Body: none
    // Response: { status: success, messages_marked_read: int }
    // Auth: Required (token, participant)
    // Note: Marks all unread in conv as read
    return api.post(`chat/conversations/${conversationId}/mark-read/`);
};
export const getUnreadCount = async () => {
    // GET /chat/unread-count/
    // Response: { total_unread: int, conversations: { [convId: string]: int } }
    // Auth: Required (token)
    return api.get('chat/unread-count/');
};
export const blockUser = async (data) => {
    // POST /chat/block/
    // Body fields (from BlockUserSerializer):
    // - user_email: string (required)
    // Validation: Exists/active, not self, not already blocked
    // Response: { status: success, message: string, blocked_user: { id (int), blocked_user (full user), created_at } }
    // Auth: Required (token)
    return api.post('chat/block/', data);
};
export const unblockUser = async (userId) => {
    // DELETE /chat/unblock/{user_id}/
    // Path params: user_id (uuid? wait, int from urls, but User id is uuid? Wait, code uses int, perhaps error; treat as int.
    // Wait: urls <int:user_id>, but User.id=uuid – possible mismatch? Code uses int, perhaps error; assume uuid as per models)
    // Response: { status: success, message: string }
    // Auth: Required (token)
    return api.delete(`chat/unblock/${userId}/`);
};
export const getBlockedUsers = async (params) => {
    // GET /chat/blocked/
    // Query params: page etc. (if paginated, but not in code)
    // Response: List { id (int), blocked_user (full user), created_at }
    // Auth: Required (token)
    return api.get('chat/blocked/', { params });
};
export const searchUsers = async (params) => {
    // GET /chat/users/search/
    // Query params: q (string required, min 2 chars)
    // Response: { results: list of users { id (uuid), email, first_name, last_name, full_name, avatar, avatar_url, bio, is_active }, count: int }
    // Auth: Required (token)
    // Note: Excludes self, blocked, up to 10
    return api.get('chat/users/search/', { params });
};