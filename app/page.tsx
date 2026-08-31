import HomeNav from './components/HomeNav'
import HomeSignal from './components/HomeSignal'

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 顶部导航 */}
      <header
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>工作后台</div>
        <HomeNav />
      </header>

      {/* 主视觉区 */}
      <section
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '60px 24px 40px',
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <h1
            style={{
              fontSize: '2.8rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '16px',
            }}
          >
            海小螺集成工作站
          </h1>
          <p
            style={{
              fontSize: '1.15rem',
              opacity: 0.85,
              lineHeight: 1.7,
              marginBottom: '28px',
              maxWidth: '480px',
            }}
          >
            让生意更简单
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="/account/manage"
              style={{
                display: 'inline-block',
                padding: '12px 20px',
                borderRadius: '10px',
                background: '#e85d4c',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              进入管理
            </a>
          </div>
        </div>

        {/* 右侧图文卡片（先用占位块，以后可换成真实图片） */}
        <div
          style={{
            flex: '1 1 300px',
            minHeight: '260px',
            height: '280px',
            borderRadius: '16px',
            background: 'rgba(22, 33, 62, 0.9)',
            border: '1px solid rgba(255,255,255,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <HomeSignal />
        </div>
      </section>

      {/* 介绍区块 */}
      <section
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '20px 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {[
          {
            title: '来，来财',
            text: '财从八方来。',
          },
          {
            title: '当前进展',
            text: '登录后去日志查看。',
          },
          {
            title: '使用指南',
            text: '没来得及写，聪明的你大概不需要指南。',
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', marginBottom: '10px' }}>{item.title}</h2>
            <p style={{ opacity: 0.82, lineHeight: 1.6, margin: 0 }}>{item.text}</p>
          </div>
        ))}
      </section>

      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: '0.85rem',
          opacity: 0.7,
        }}
      >
        © {new Date().getFullYear()} 海小螺
      </footer>
    </main>
  )
}