const Groq = require('groq-sdk');
const Chat = require('../models/Chat');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function getAIResponse(userMessage, userId, conversationId = null) {
  try {
    console.log('📨 Message:', userMessage);
    console.log('👤 User ID:', userId);

    // First, use AI to determine if this is a data operation
    const intentCheck = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are an intent classifier. Determine if the user wants to:
          1. ADD_USER - wants to add a new user to database (requires name, age, email)
          2. FIND_USER - wants to find/search for a user (by email or name)
          3. GET_USERS - wants to see all users
          4. DELETE_USER - wants to delete a user (by email)
          5. UPDATE_USER_AGE - wants to update a user's age (by email)
          6. UPDATE_USER_NAME - wants to update a user's name (by email)
          7. UPDATE_USER_EMAIL - wants to update a user's email (by current email)
          8. UPDATE_USER_FIELD - wants to update any user field (name, age, or email)
          9. CHAT - normal conversation
          
          Respond with ONLY the intent type and extracted data in JSON format.
          
          Examples:
          {"intent": "ADD_USER", "name": "John", "age": 25, "email": "john@example.com"}
          {"intent": "FIND_USER", "email": "john@example.com"}
          {"intent": "FIND_USER", "name": "John"}
          {"intent": "GET_USERS"}
          {"intent": "DELETE_USER", "email": "john@example.com"}
          {"intent": "UPDATE_USER_AGE", "email": "john@example.com", "age": 30}
          {"intent": "UPDATE_USER_NAME", "email": "john@example.com", "newName": "Jonathan"}
          {"intent": "UPDATE_USER_EMAIL", "email": "john@example.com", "newEmail": "jonathan@example.com"}
          {"intent": "UPDATE_USER_FIELD", "email": "john@example.com", "field": "name", "value": "Jonathan"}
          {"intent": "CHAT"}`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    let intentResult;
    try {
      const content = intentCheck.choices[0].message.content;
      console.log('🤖 AI Response:', content);
      intentResult = JSON.parse(content);
      console.log('🎯 Intent:', intentResult);
    } catch (e) {
      console.log('Failed to parse intent, defaulting to CHAT');
      intentResult = { intent: 'CHAT' };
    }

    // Handle ADD_USER intent
    if (intentResult.intent === 'ADD_USER' && intentResult.name && intentResult.age && intentResult.email) {
      console.log(`📝 Adding user: ${intentResult.name}, Age: ${intentResult.age}, Email: ${intentResult.email}`);

      // Check if user already exists by email (unique key)
      const existingUser = await User.findOne({
        email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') }
      });

      let response;
      if (existingUser) {
        response = `⚠️ User with email "${intentResult.email}" already exists.\n\n📋 Existing user:\n• Name: ${existingUser.name}\n• Age: ${existingUser.age}\n• Email: ${existingUser.email}`;
      } else {
        const newUser = new User({
          name: intentResult.name.charAt(0).toUpperCase() + intentResult.name.slice(1).toLowerCase(),
          age: intentResult.age,
          email: intentResult.email.toLowerCase(),
          userId: userId
        });

        await newUser.save();
        console.log('✅ User saved:', newUser);

        const userCount = await User.countDocuments({ userId: userId });
        response = `✅ User **${newUser.name}** has been added to the database!\n\n📋 **Details:**\n• Name: ${newUser.name}\n• Age: ${newUser.age}\n• Email: ${newUser.email}\n📊 Total users now: ${userCount}`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle UPDATE_USER_AGE intent (by email)
    if (intentResult.intent === 'UPDATE_USER_AGE' && intentResult.email && intentResult.age) {
      console.log(`📝 Updating user age for email: ${intentResult.email} to ${intentResult.age}`);

      const updatedUser = await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') } },
        { age: intentResult.age },
        { new: true }
      );

      let response;
      if (updatedUser) {
        response = `✅ User "${updatedUser.name}" age has been updated to ${updatedUser.age}.\n\n📋 **Updated User:**\n• Name: ${updatedUser.name}\n• Age: ${updatedUser.age}\n• Email: ${updatedUser.email}`;
      } else {
        response = `❌ User with email "${intentResult.email}" not found in your database.`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle UPDATE_USER_NAME intent (by email)
    if (intentResult.intent === 'UPDATE_USER_NAME' && intentResult.email && intentResult.newName) {
      console.log(`📝 Updating user name for email: ${intentResult.email} to ${intentResult.newName}`);

      const updatedUser = await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') } },
        { name: intentResult.newName.charAt(0).toUpperCase() + intentResult.newName.slice(1).toLowerCase() },
        { new: true }
      );

      let response;
      if (updatedUser) {
        response = `✅ User name has been updated!\n\n📋 **Updated User:**\n• Name: ${updatedUser.name}\n• Age: ${updatedUser.age}\n• Email: ${updatedUser.email}`;
      } else {
        response = `❌ User with email "${intentResult.email}" not found in your database.`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle UPDATE_USER_EMAIL intent (change email)
    if (intentResult.intent === 'UPDATE_USER_EMAIL' && intentResult.email && intentResult.newEmail) {
      console.log(`📝 Updating user email from ${intentResult.email} to ${intentResult.newEmail}`);

      // Check if new email already exists
      const existingUser = await User.findOne({
        email: { $regex: new RegExp(`^${intentResult.newEmail}$`, 'i') }
      });

      let response;
      if (existingUser) {
        response = `⚠️ User with email "${intentResult.newEmail}" already exists. Please use a different email.`;
      } else {
        const updatedUser = await User.findOneAndUpdate(
          { email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') } },
          { email: intentResult.newEmail.toLowerCase() },
          { new: true }
        );

        if (updatedUser) {
          response = `✅ User email has been updated!\n\n📋 **Updated User:**\n• Name: ${updatedUser.name}\n• Age: ${updatedUser.age}\n• Email: ${updatedUser.email}`;
        } else {
          response = `❌ User with email "${intentResult.email}" not found in your database.`;
        }
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle UPDATE_USER_FIELD intent (generic field update)
    if (intentResult.intent === 'UPDATE_USER_FIELD' && intentResult.email && intentResult.field && intentResult.value) {
      console.log(`📝 Updating user field: ${intentResult.field} to ${intentResult.value} for email: ${intentResult.email}`);

      const updateData = {};
      if (intentResult.field === 'name') {
        updateData.name = intentResult.value.charAt(0).toUpperCase() + intentResult.value.slice(1).toLowerCase();
      } else if (intentResult.field === 'age') {
        updateData.age = parseInt(intentResult.value);
      } else if (intentResult.field === 'email') {
        updateData.email = intentResult.value.toLowerCase();
      }

      const updatedUser = await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') } },
        updateData,
        { new: true }
      );

      let response;
      if (updatedUser) {
        response = `✅ User "${updatedUser.name}" ${intentResult.field} has been updated to "${intentResult.value}".\n\n📋 **Updated User:**\n• Name: ${updatedUser.name}\n• Age: ${updatedUser.age}\n• Email: ${updatedUser.email}`;
      } else {
        response = `❌ User with email "${intentResult.email}" not found in your database.`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle FIND_USER intent (by email or name)
    if (intentResult.intent === 'FIND_USER' && (intentResult.email || intentResult.name)) {
      let query = {};
      if (intentResult.email) {
        query.email = { $regex: new RegExp(`^${intentResult.email}$`, 'i') };
        console.log(`🔍 Searching for user by email: ${intentResult.email}`);
      } else if (intentResult.name) {
        query.name = { $regex: new RegExp(`^${intentResult.name}$`, 'i') };
        console.log(`🔍 Searching for user by name: ${intentResult.name}`);
      }

      const user = await User.findOne(query);

      let response;
      if (user) {
        response = `✅ **User Found!**\n\n📋 **Details:**\n• Name: ${user.name}\n• Age: ${user.age}\n• Email: ${user.email}\n• User ID: ${user.userId}\n• Added: ${new Date(user.createdAt).toLocaleString()}`;
      } else {
        response = `❌ User not found in your database.\n\nWould you like to add them? Say "add user [name] age [age] email [email]".`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle GET_USERS intent - SHOW ALL USERS IN DATABASE
    if (intentResult.intent === 'GET_USERS') {
      console.log('🔍 Fetching ALL users from database...');

      // Get ALL users from database (no userId filter)
      const users = await User.find({}).sort({ createdAt: -1 });

      console.log(`📊 Found ${users.length} total users in database`);

      let response;
      if (users.length === 0) {
        response = "📋 No users found in the database. Add one by saying 'add user [name] age [age] email [email]'";
      } else {
        // Group users by session/device
        const sessionUsers = users.filter(u => u.userId === userId);
        const otherUsers = users.filter(u => u.userId !== userId);

        let userList = '';

        if (sessionUsers.length > 0) {
          userList += `\n**Users from your current session (${sessionUsers.length}):**\n`;
          sessionUsers.forEach((user, index) => {
            userList += `${index + 1}. **${user.name}** (Age: ${user.age}) - Email: ${user.email}\n`;
          });
        }

        if (otherUsers.length > 0) {
          userList += `\n**Users from other sessions (${otherUsers.length}):**\n`;
          otherUsers.forEach((user, index) => {
            userList += `${index + 1}. **${user.name}** (Age: ${user.age}) - Email: ${user.email} (Session: ${user.userId.substring(0, 15)}...)\n`;
          });
        }

        response = `📊 **All Users in Database** (${users.length} total):\n${userList}\n\n💡 To manage users from other sessions, use their email address as the unique identifier.`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Handle DELETE_USER intent
    if (intentResult.intent === 'DELETE_USER' && intentResult.email) {
      console.log(`🗑️ Deleting user with email: ${intentResult.email}`);

      const deletedUser = await User.findOneAndDelete({
        email: { $regex: new RegExp(`^${intentResult.email}$`, 'i') }
      });

      let response;
      if (deletedUser) {
        response = `✅ User "${deletedUser.name}" (${deletedUser.email}) has been deleted from the database.`;
      } else {
        response = `❌ User with email "${intentResult.email}" not found in your database.`;
      }

      const chat = new Chat({
        user: userId,
        message: userMessage,
        response: response,
        conversationId: conversationId || 'temp',
        timestamp: new Date()
      });
      await chat.save();

      return { response, conversationId };
    }

    // Normal AI flow for regular chat
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const conversation = new Conversation({
        userId: userId,
        title: userMessage.substring(0, 50),
        messages: []
      });
      await conversation.save();
      activeConversationId = conversation._id.toString();
      console.log('📝 Created new conversation:', activeConversationId);
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant. Keep responses concise and friendly. 
          You can help users manage their data. Users are identified by unique email.
          Available commands:
          - "add user [name] age [age] email [email]"
          - "find user with email [email]"
          - "find user named [name]"
          - "show all users"
          - "delete user with email [email]"
          - "update age for [email] to [new age]"
          - "update name for [email] to [new name]"
          - "change email from [old email] to [new email]"`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('💬 AI Response generated');

    const chat = new Chat({
      user: userId,
      message: userMessage,
      response: aiResponse,
      conversationId: activeConversationId,
      timestamp: new Date()
    });
    await chat.save();

    await Conversation.findOneAndUpdate(
      { _id: activeConversationId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: userMessage, timestamp: new Date() },
              { role: 'assistant', content: aiResponse, timestamp: new Date() }
            ]
          }
        },
        $set: { updatedAt: new Date() }
      }
    );

    return {
      response: aiResponse,
      conversationId: activeConversationId
    };
  } catch (error) {
    console.error('❌ Error in getAIResponse:', error);
    return {
      response: "I'm having trouble responding right now. Please try again.",
      conversationId: conversationId || null
    };
  }
}

module.exports = { getAIResponse };