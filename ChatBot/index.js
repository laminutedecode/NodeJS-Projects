// Importer le module dotenv et le configurer pour charger les variables d'environnement depuis un fichier .env
require('dotenv').config();

// Importer les modules Discord.js et OpenAI
const { Client, IntentsBitField } = require('discord.js');
const OpenAI = require('openai');

// Créer une instance de l'API OpenAI en utilisant la clé d'API stockée dans les variables d'environnement
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Créer une instance du client Discord
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    // IntentsBitField.Flags.Guilds: Cette intention indique que le bot souhaite recevoir des événements liés aux serveurs (guilds) auxquels il est connecté. Cela inclut des événements tels que la création ou la suppression de serveurs.
    IntentsBitField.Flags.GuildMessages,
    // Cette intention indique que le bot souhaite recevoir des événements liés aux messages dans les serveurs auxquels il est connecté. Cela inclut des événements tels que la réception de nouveaux messages, la modification de messages existants, etc.
    IntentsBitField.Flags.MessageContent,
    // Cette intention indique que le bot souhaite accéder au contenu des messages. Cela signifie qu'il souhaite recevoir des informations sur le texte contenu dans les messages, ce qui est essentiel pour la fonctionnalité de chat ou de réponse aux commandes.
  ],
});

// Événement déclenché lorsque le bot Discord est prêt
client.on('ready', () => {
  console.log('Le Bot est en ligne');
});

// Événement déclenché lorsqu'un message est créé dans un serveur Discord
client.on('messageCreate', async (message) => {
  // Vérifier si l'auteur du message est un bot, si le canal n'est pas celui spécifié dans les variables d'environnement
  // ou si le message commence par '!'
  if (message.author.bot || message.channel.id !== process.env.CHANNEL_ID || message.content.startsWith('!')) {
    return;
  }

  // Initialiser un journal de conversation avec un message système
  let conversationLog = [{ role: 'system', content: 'You are a friendly chatbot.' }];

  try {
    // Indiquer que le bot est en train de taper une réponse
    await message.channel.sendTyping();

    // Récupérer les 15 messages précédents dans le canal
    const prevMessages = await message.channel.messages.fetch({ limit: 15 });

    // Inverser l'ordre des messages pour commencer par le plus ancien
    prevMessages.reverse().forEach((msg) => {
      // Ignorer les messages commençant par '!' ou les messages d'autres bots (sauf le bot actuel)
      if (msg.content.startsWith('!') || (msg.author.bot && msg.author.id !== client.user.id)) {
        return;
      }

      // Déterminer le rôle (utilisateur ou assistant) du message et nettoyer le nom d'utilisateur
      const role = msg.author.id === client.user.id ? 'assistant' : 'user';
      const name = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

      // Ajouter le message au journal de conversation
      conversationLog.push({ role, content: msg.content, name });
    });

    // Générer une réponse en utilisant l'API OpenAI avec le journal de conversation
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationLog
    });

    // Envoyer la première réponse générée en tant que réponse au message original
    if (completion.choices.length > 0 && completion.choices[0].message) {
      await message.reply(completion.choices[0].message);
    }
  } catch (error) {
    // Gérer les erreurs en affichant un message d'erreur dans la console
    console.error(`Error: ${error.message}`);
  }
});

// Connecter le bot en utilisant le jeton d'authentification stocké dans les variables d'environnement
client.login(process.env.TOKEN);
