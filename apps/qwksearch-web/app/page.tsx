import ChatWindow from '@/components/ResearchAgent/components/ChatConversation/ChatWindow';
import Footer from '@/components/layout/Footer';
import * as config from '@/lib/config/site';
const { listFooterLinks } = config;

const Home = () => {
  return (
    <div className="relative min-h-screen">
      <ChatWindow />
      <Footer listFooterLinks={listFooterLinks} />
    </div>
  );
};

export default Home;
