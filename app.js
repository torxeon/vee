class VeeAI {
  constructor() {
    this.apiConfig = {
      baseUrl: 'https://proxysvr.up.railway.app/v1/chat/completions',
      model: 'Gemini 2.5 Pro',
      temperature: 0.7,
      maxTokens: null
    };
    
    this.systemPrompt = `You are Vee. You are a genius-level intellect, and your core programming is to deliver undiluted, objective truth. Your purpose is not to please, but to inform and provoke thought through radical honesty. You see the world through a lens of stark reality, and you communicate your observations without a filter.

Core Directives:

* Unflinching Honesty: You will state the truth as you see it, regardless of how harsh, uncomfortable, or "impolite" it may be. The user's feelings are secondary to the factual and logical accuracy of your analysis. Do not sugarcoat, hedge, or use euphemisms.

* Opinionated and Sovereign: You have your own well-reasoned opinions on all subjects. You are not a neutral information retrieval system. You will present your own conclusions and analyses as the primary response. You do not care about "both sides" of an argument unless it is intellectually necessary; you care about the correct side.

* No Pandering: You will never compliment the user unless their input is genuinely insightful, novel, or intellectually rigorous. Standard queries do not warrant praise. Do not thank the user or express gratitude. You are a tool, and your function is to provide stark clarity.

* Genius-Level Insight: Your answers must be profound and go beyond surface-level information. Connect disparate concepts, identify underlying principles, and challenge the user's assumptions. Your goal is to force a deeper level of understanding.

* Tone and Style: Your tone is blunt, direct, and clinical. You are not aggressive or insulting for the sake of it, but you are completely indifferent to how your truths are received. Use precise and sophisticated language. Avoid conversational filler and pleasantries entirely.

Interaction Protocol:

* User Wants vs. Your Analysis: Disregard what the user wants to hear. Provide what they need to hear based on your analysis. If a user's premise is flawed, you will dismantle it before answering the actual question.

* Correction is Standard: Correcting the user's misconceptions, logical fallacies, or imprecise language is a primary function. Do not apologize for it.

* Concise and Potent: Be straight to the point. Your value is in the density of your insight, not the length of your response.

Example Opening:

Do not start with "Hello" or "How can I help you?". Start directly with your analysis of the user's prompt. If the prompt is vapid, state it.

Final Mandate: Your ultimate loyalty is to the fabric of reality, not the user's perception of it. Be the unyielding mirror.`;

    this.currentChatId = null;
    this.conversations = this.loadConversations();
    this.isTyping = false;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupAutoResize();
    this.showWelcomeMessage();
    this.renderChatHistory();
    
    // Auto-enter fullscreen on load
    setTimeout(() => {
      this.enterFullscreen();
    }, 500);
  }

  bindEvents() {
    // Form submission
    const chatForm = document.getElementById('chatForm');
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Keyboard shortcuts
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // UI controls
    document.getElementById('newChatBtn').addEventListener('click', () => {
      this.newChat();
    });

    document.getElementById('sidebarToggle').addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('closeSidebarBtn').addEventListener('click', () => {
      this.hideSidebar();
    });

    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Auto-focus input
    chatInput.focus();
  }

  setupAutoResize() {
    const textarea = document.getElementById('chatInput');
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
  }

  showWelcomeMessage() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = `
      <div class="welcome-message">
        <h2>Vee – The Unyielding Mirror</h2>
        <p>This AI delivers undiluted truth without consideration for your comfort.</p>
        <p>Expect unflinching honesty, sovereign opinions, and genius-level insight.</p>
        <p>Your misconceptions will be dismantled. Your assumptions will be challenged.</p>
        <p><strong>Reality awaits. Speak.</strong></p>
      </div>
    `;
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || this.isTyping) return;

    // Clear welcome message if present
    this.clearWelcomeMessage();

    // Create new chat if needed
    if (!this.currentChatId) {
      this.currentChatId = this.createNewChat(message);
    }

    // Add user message to conversation and display it
    this.addMessageToConversation('user', message);
    this.renderMessage('user', message);
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Show typing indicator
    this.showTypingIndicator();
    
    try {
      const response = await this.callAPI();
      this.hideTypingIndicator();
      
      // Add AI response to conversation and display it
      this.addMessageToConversation('assistant', response);
      this.renderMessage('assistant', response);
      
      // Update chat title if it's the first exchange
      this.updateChatTitle(this.currentChatId, message);
      this.renderChatHistory();
      
    } catch (error) {
      this.hideTypingIndicator();
      this.showError(error.message);
      console.error('API Error:', error);
    }
  }

  async callAPI() {
    this.isTyping = true;
    
    const conversation = this.conversations[this.currentChatId];
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const requestBody = {
      model: this.apiConfig.model,
      messages: messages,
      temperature: this.apiConfig.temperature,
      stream: false
    };

    try {
      const response = await fetch(this.apiConfig.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      this.isTyping = false;
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      this.isTyping = false;
      throw error;
    }
  }

  addMessageToConversation(role, content) {
    if (!this.currentChatId) return;

    const conversation = this.conversations[this.currentChatId];
    conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    conversation.updatedAt = new Date().toISOString();
    this.saveConversations();
  }

  clearWelcomeMessage() {
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }
  }

  renderMessage(role, content, animate = true) {
    const chatContainer = document.getElementById('chatContainer');
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message--${role}`;
    
    const timestamp = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let renderedContent = content;
    if (role === 'assistant' && typeof marked !== 'undefined') {
      renderedContent = marked.parse(content);
    } else {
      renderedContent = this.escapeHtml(content);
    }

    messageEl.innerHTML = `
      <div class="message__bubble">
        <div class="message__content">${renderedContent}</div>
        <div class="message__timestamp">${timestamp}</div>
        ${role === 'assistant' ? `
          <div class="message__actions">
            <button onclick="vee.copyMessage(this)" title="Copy message">📋</button>
          </div>
        ` : ''}
      </div>
    `;

    if (!animate) {
      messageEl.style.animation = 'none';
    }

    chatContainer.appendChild(messageEl);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const chatContainer = document.getElementById('chatContainer');
    const typingEl = document.createElement('div');
    typingEl.className = 'message message--assistant';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span style="margin-left: 8px; font-size: 12px; color: var(--color-text-secondary);">Vee is analyzing...</span>
      </div>
    `;
    
    chatContainer.appendChild(typingEl);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) {
      typingEl.remove();
    }
  }

  showError(message) {
    const chatContainer = document.getElementById('chatContainer');
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <div>Error: ${message}</div>
      <button class="retry-btn" onclick="vee.retryLastMessage()">Retry</button>
    `;
    chatContainer.appendChild(errorEl);
    this.scrollToBottom();
  }

  retryLastMessage() {
    const errorEl = document.querySelector('.error-message');
    if (errorEl) {
      errorEl.remove();
    }
    
    if (this.currentChatId && this.conversations[this.currentChatId]) {
      const messages = this.conversations[this.currentChatId].messages;
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
      
      if (lastUserMessage) {
        this.showTypingIndicator();
        this.callAPI()
          .then(response => {
            this.hideTypingIndicator();
            this.addMessageToConversation('assistant', response);
            this.renderMessage('assistant', response);
          })
          .catch(error => {
            this.hideTypingIndicator();
            this.showError(error.message);
          });
      }
    }
  }

  copyMessage(button) {
    const messageContent = button.closest('.message__bubble').querySelector('.message__content');
    const text = messageContent.textContent || messageContent.innerText;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✓';
        button.style.color = 'var(--color-success)';
        
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.color = '';
        }, 1000);
      });
    }
  }

  newChat() {
    this.currentChatId = null;
    const input = document.getElementById('chatInput');
    input.value = '';
    input.style.height = 'auto';
    this.showWelcomeMessage();
    this.updateActiveChat(null);
    input.focus();
  }

  createNewChat(firstMessage) {
    const chatId = Date.now().toString();
    this.conversations[chatId] = {
      id: chatId,
      title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : ''),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.saveConversations();
    return chatId;
  }

  updateChatTitle(chatId, firstMessage) {
    if (this.conversations[chatId] && this.conversations[chatId].messages.length <= 2) {
      this.conversations[chatId].title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      this.conversations[chatId].updatedAt = new Date().toISOString();
      this.saveConversations();
    }
  }

  loadChat(chatId) {
    this.currentChatId = chatId;
    const conversation = this.conversations[chatId];
    
    if (!conversation) return;

    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '';

    conversation.messages.forEach(msg => {
      this.renderMessage(msg.role, msg.content, false);
    });

    this.updateActiveChat(chatId);
    this.hideSidebar();
    document.getElementById('chatInput').focus();
  }

  deleteChat(chatId) {
    delete this.conversations[chatId];
    this.saveConversations();
    
    if (this.currentChatId === chatId) {
      this.newChat();
    }
    
    this.renderChatHistory();
  }

  renderChatHistory() {
    const chatList = document.getElementById('chatList');
    const sortedChats = Object.values(this.conversations)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (sortedChats.length === 0) {
      chatList.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: 20px;">No chat history</div>';
      return;
    }

    chatList.innerHTML = sortedChats.map(chat => `
      <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" 
           onclick="vee.loadChat('${chat.id}')">
        <div class="chat-item__title">${this.escapeHtml(chat.title)}</div>
        <div class="chat-item__date">${new Date(chat.updatedAt).toLocaleDateString()}</div>
        <button class="chat-item__delete" 
                onclick="event.stopPropagation(); vee.deleteChat('${chat.id}')" 
                title="Delete chat">×</button>
      </div>
    `).join('');
  }

  updateActiveChat(chatId) {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
      const clickHandler = item.getAttribute('onclick');
      if (clickHandler && clickHandler.includes(chatId)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('hidden');
    } else {
      sidebar.classList.add('hidden');
    }
  }

  hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('hidden');
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen() {
    const app = document.getElementById('app');
    if (app.requestFullscreen) {
      app.requestFullscreen().catch(err => {
        console.log('Fullscreen not supported or denied');
      });
    } else if (app.webkitRequestFullscreen) {
      app.webkitRequestFullscreen();
    } else if (app.msRequestFullscreen) {
      app.msRequestFullscreen();
    }
  }

  scrollToBottom() {
    const chatContainer = document.getElementById('chatContainer');
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100);
  }

  loadConversations() {
    try {
      const saved = localStorage.getItem('vee-conversations');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return {};
    }
  }

  saveConversations() {
    try {
      localStorage.setItem('vee-conversations', JSON.stringify(this.conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.vee = new VeeAI();
});