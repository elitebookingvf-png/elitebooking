'use client'
import { useState, useEffect, useRef } from 'react'

type Client = {
  id: string | null
  name: string
  phone: string | null
  isRegistered: boolean
  source: 'rdv' | 'profile'
}

interface PhoneSearchProps {
  onClientSelect: (client: Client) => void
  onManualInput: () => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export default function PhoneSearch({ 
  onClientSelect, 
  onManualInput, 
  placeholder = "Rechercher par téléphone...",
  value = "",
  onChange
}: PhoneSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Client[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    const searchClients = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          // Filter to only show clients with phone numbers
          const clientsWithPhone = (data.clients || []).filter((c: Client) => c.phone)
          // Sort by phone number match (prioritize phone starts with query)
          const sorted = clientsWithPhone.sort((a: Client, b: Client) => {
            const aStartsWith = a.phone?.startsWith(query) ? 2 : a.phone?.includes(query) ? 1 : 0
            const bStartsWith = b.phone?.startsWith(query) ? 2 : b.phone?.includes(query) ? 1 : 0
            return bStartsWith - aStartsWith
          })
          setResults(sorted)
          setShowResults(sorted.length > 0)
        }
      } catch (error) {
        console.error('Phone search error:', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchClients, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setQuery(client.phone || '')
    setShowResults(false)
    onClientSelect(client)
    if (onChange) {
      onChange(client.phone || '')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (onChange) {
      onChange(value)
    }
    if (selectedClient && value !== selectedClient.phone) {
      setSelectedClient(null)
      onManualInput()
    }
  }

  const clearSelection = () => {
    setSelectedClient(null)
    setQuery('')
    setResults([])
    setShowResults(false)
    onManualInput()
    if (onChange) {
      onChange('')
    }
  }

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="tel"
          className="form-control"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && results.length > 0 && setShowResults(true)}
          style={{
            width: '100%',
            padding: '10px 35px 10px 14px',
            borderRadius: '8px',
            border: selectedClient?.phone ? '2px solid #C17B4E' : '1px solid #ddd',
            fontSize: '0.95rem',
            backgroundColor: selectedClient?.phone ? '#fdf0e6' : '#fff',
          }}
        />
        {selectedClient && (
          <button
            onClick={clearSelection}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#C17B4E',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        )}
        {loading && !selectedClient && (
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #C17B4E',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '250px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {results.map((client, index) => (
            <div
              key={`${client.id || client.name}-${index}`}
              onClick={() => handleClientClick(client)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < results.length - 1 ? '1px solid #eee' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '1rem', color: '#333' }}>
                    {client.phone}
                  </span>
                  {client.isRegistered && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        fontWeight: 500,
                      }}
                    >
                      Inscrit
                    </span>
                  )}
                  {!client.isRegistered && client.source === 'rdv' && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#e2e3e5',
                        color: '#383d41',
                        fontWeight: 500,
                      }}
                    >
                      Connu
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {client.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
