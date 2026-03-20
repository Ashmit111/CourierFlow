'use client'

import { useState, useEffect } from 'react'

export default function DataTable({ columns, data, keyField = '_id', renderRow, renderCard, emptyText = 'No data available', emptyIcon = '📄' }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">{emptyIcon}</div>
        <div>{emptyText}</div>
      </div>
    )
  }

  if (isMobile && renderCard) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map(item => (
          <div key={item[keyField]}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => {
                const isRightAligned = col === 'Actions' || col === 'Timestamp';
                return (
                  <th 
                    key={i} 
                    style={{ 
                      textAlign: isRightAligned ? 'right' : 'left',
                      width: isRightAligned ? '1%' : 'auto',
                      whiteSpace: isRightAligned ? 'nowrap' : 'normal',
                    }}
                  >
                    {col}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item[keyField]}>
                {renderRow(item)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
