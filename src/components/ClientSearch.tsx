'use client'
import { useState, useEffect, useRef } from 'react'

type Client = {
  id: string | null
  name: string
  phone: string | null
  isRegistered: boolean
  source: 'rdv' | 'profile'
}

type ClientSearchProps = {
  onClientSelect: (client: Client) => void
  onManualInput: () => void
  placeholder?: string
}

export default function ClientSearch({ onClientSelect, onManualInput, placeholder = "Rechercher un client..." }: ClientSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
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
          setResults(data.clients || [])
          setShowResults(true)
        }
      } catch (error) {
        console.error('Client search error:', error)
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
    setQuery(client.name)
    setShowResults(false)
    onClientSelect(client)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (selectedClient && value !== selectedClient.name) {
      setSelectedClient(null)
      onManualInput()
    }
  }

  const clearSelection = () => {
    setSelectedClient(null)
    setQuery('')
    setShowResults(false)
    onManualInput()
  }

  return (
    <div ref={searchRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className="form-control"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          style={{ 
            paddingRight: selectedClient ? '40px' : '12px',
            borderColor: selectedClient ? '#C17B4E' : undefined,
            backgroundColor: selectedClient ? '#fdf0e6' : undefined
          }}
        />
        {selectedClient && (
          <button
            type="button"
            onClick={clearSelection}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Effacer la sélection"
          >
            ✕
          </button>
        )}
        {loading && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              fontSize: '12px',
              color: '#666'
            }}
          >
            ...
          </div>
        )}
      </div>

      {selectedClient && (
        <div style={{
          marginTop: '6px',
          fontSize: '0.75rem',
          color: '#C17B4E',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>✓</span>
          <span>Client {selectedClient.isRegistered ? 'inscrit' : 'connu'} sélectionné</span>
          {selectedClient.phone && <span>• {selectedClient.phone}</span>}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '240px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {results.map((client, index) => (
            <div
              key={`${client.id}-${index}`}
              onClick={() => handleClientClick(client)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f8f8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff'
              }}
            >
              <div>
                <div style={{
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  color: '#333',
                  marginBottom: '2px'
                }}>
                  {client.name}
                </div>
                {client.phone && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666'
                  }}>
                    📞 {client.phone}
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                {client.isRegistered && (
                  <span style={{
                    background: '#e8f8ee',
                    color: '#27AE60',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    textTransform: 'uppercase'
                  }}>
                    Inscrit
                  </span>
                )}
                <span style={{
                  fontSize: '0.65rem',
                  color: '#999',
                  textTransform: 'uppercase'
                }}>
                  {client.source === 'profile' ? 'Profil' : 'Historique'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && !loading && results.length === 0 && query.length >= 2 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.85rem',
          zIndex: 1000
        }}>
          Aucun client trouvé pour "{query}"
        </div>
      )}
    </div>
  )
}
