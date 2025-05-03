import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import { useUserStore } from "./user";

interface ChatMessage {
  message: string;
  reply: string;
}

interface FormattedMessage {
  role: "user" | "ai";
  content: string;
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref<{ role: string; content: string }[]>([]);
  const isLoading = ref(false);

  const userStore = useUserStore();

  // Clean up AI response text
  const cleanResponse = (text: string): string => {
    return text
      .replace(/\\n/g, "\n") // Replace \n with actual newlines
      .replace(/\\"/g, '"') // Replace \" with "
      .replace(/\\t/g, "") // Remove \t
      .replace(/\\r/g, "") // Remove \r
      .replace(/\\/g, "") // Remove any remaining backslashes
      .replace(/\{.*?\}/g, "") // Remove any JSON-like objects
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove ** for bold text
      .replace(/\*(.*?)\*/g, "$1") // Remove * for italic text
      .replace(/`(.*?)`/g, "$1") // Remove ` for code
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1") // Remove markdown links
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/>\s/g, "") // Remove blockquotes
      .replace(/---/g, "") // Remove horizontal rules
      .trim(); // Remove extra whitespace
  };

  // Load prev chat messages
  const loadChatHistory = async () => {
    if (!userStore.userId) return;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/get-messages`,
        {
          userId: userStore.userId,
        }
      );

      messages.value = data.messages
        .flatMap((msg: ChatMessage): FormattedMessage[] => [
          { role: "user", content: msg.message },
          { role: "ai", content: cleanResponse(msg.reply) },
        ])
        .filter((msg: FormattedMessage) => msg.content.trim()); // Only show non-empty messages
    } catch (error) {
      console.error("Error Loading Chat History: ", error);
    }
  };

  //Send New Message to AI

  const sendMessage = async (message: string) => {
    if (!message.trim() || !userStore.userId) return;

    messages.value.push({ role: "user", content: message });
    isLoading.value = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/chat`,
        {
          message,
          userId: userStore.userId,
        }
      );
      messages.value.push({ role: "ai", content: data.reply });
    } catch (error) {
      console.error("Error when sending message: ", error);
      messages.value.push({
        role: "ai",
        content: "Error: unable to process the request",
      });
    } finally {
      isLoading.value = false;
    }
  };

  return { messages, isLoading, loadChatHistory, sendMessage };
});
