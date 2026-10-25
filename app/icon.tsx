import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 170,
            fontWeight: 800,
            letterSpacing: -10,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <span style={{ color: '#F0EDE8' }}>KLS</span>
          <span style={{ color: '#4B7BF5' }}>3</span>
        </div>
      </div>
    ),
    size
  )
}
