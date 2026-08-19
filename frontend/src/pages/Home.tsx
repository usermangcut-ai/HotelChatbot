import { Bot, RefreshCw, Send, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postChat } from "../api";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  imageUrl?: string;
}

const SUGGESTIONS = ["Xem hạng phòng", "Giá phòng hôm nay", "Dịch vụ Spa", "Chính sách đặt phòng"];

const HIGHLIGHTS = [
  { img: "/images/room_deluxe_ocean_view_queen.jpg", title: "Deluxe Ocean View", desc: "Ban công hướng biển." },
  { img: "/images/room_villa_3_bedroom_beachfront.jpg", title: "Villa Beachfront", desc: "Sát bãi cát trắng." },
  { img: "/images/room_deluxe_park_suite.jpg", title: "Deluxe Park Suite", desc: "Không gian rộng rãi." },
];

function makeId() {
  return Math.random().toString(36).slice(2);
}

function initialMessages(): Message[] {
  return [
    {
      id: "init",
      sender: "bot",
      text: "Xin chào quý khách! Tôi là Lễ tân ảo của Shanghai Resort. Tôi có thể giúp gì cho quý khách hôm nay?",
    },
  ];
}

export default function Home() {
  const [sessionId, setSessionId] = useState(() => makeId());
  const [messages, setMessages] = useState<Message[]>(initialMessages());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function send(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: makeId(), sender: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await postChat(sessionId, text);

      let imageUrl: string | undefined;
      const photoIndexes = res.tool_calls
        .map((call, index) => (call.name === "show_photos_tool" ? index : -1))
        .filter((index) => index !== -1);
      // Một reply chỉ hiển thị ảnh khi agent chọn đúng MỘT ảnh. Nếu model gọi nhiều ảnh (ví dụ
      // giới thiệu cả catalog), không tự lấy ảnh đầu tiên làm đại diện vì sẽ gây hiểu nhầm.
      if (photoIndexes.length === 1) {
        try {
          const payload = JSON.parse(res.tool_results[photoIndexes[0]]) as { image_path?: string };
          imageUrl = payload.image_path;
        } catch {
          imageUrl = undefined;
        }
      }

      setMessages((prev) => [...prev, { id: makeId(), sender: "bot", text: res.reply, imageUrl }]);

      const bookingCall = res.tool_calls.find((c) => c.name === "open_booking_form_tool");
      if (bookingCall) navigate("/dat-phong", { state: bookingCall.args });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), sender: "bot", text: "Xin lỗi, có lỗi kết nối. Quý khách thử lại giúp em." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setSessionId(makeId());
    setMessages(initialMessages());
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-white rounded-3xl border border-gray-150 shadow-md flex flex-col overflow-hidden min-h-[calc(100vh-8rem)]">
        <div className="bg-primary-dark text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-gold/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="font-serif-display text-sm font-bold flex items-center gap-1.5">
                Lễ tân ảo Shanghai Resort <Sparkles className="w-3.5 h-3.5 text-gold" />
              </p>
              <p className="text-[10px] text-white/60">Sẵn sàng hỗ trợ 24/7</p>
            </div>
          </div>
          <button
            onClick={newConversation}
            className="text-[11px] flex items-center gap-1 border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10"
          >
            <RefreshCw className="w-3 h-3" /> Hội thoại mới
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5 bg-slate-50/50">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 max-w-[85%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.sender === "user" ? "bg-amber-50 text-amber-700" : "bg-primary-dark text-gold"
                }`}
              >
                {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.sender === "user" ? "bg-primary-dark text-white" : "bg-white border border-gray-100 text-primary-dark"
                }`}
              >
                {m.text}
                {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 rounded-lg max-w-full" />}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-primary-dark/60 pl-9">Đang trả lời...</div>}
        </div>

        <div className="border-t border-gray-150 p-4 space-y-3 bg-white">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 rounded-full border border-gold text-xs text-primary-dark hover:bg-gold/10"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về dịch vụ, đặt phòng hoặc kinh nghiệm du lịch..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-dark text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1.5"
            >
              Gửi <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <aside className="hidden lg:flex flex-col gap-4">
        <div className="rounded-2xl overflow-hidden relative h-40">
          <img src="/images/hotel.jpg" alt="Shanghai Resort" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary-dark/40 flex items-end p-4">
            <p className="font-serif-display text-white text-sm font-bold">Vịnh Biển Thiên Đường</p>
          </div>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Trải nghiệm nổi bật</p>
          <div className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex gap-2.5 items-center">
                <img src={h.img} alt={h.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary-dark">{h.title}</p>
                  <p className="text-[11px] text-gray-500">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
