import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Lock, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authHelpers } from '@/lib/supabase'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Optionally, you could verify recovery state here via onAuthStateChange
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast({ title: 'Senha fraca', description: 'Use ao menos 6 caracteres', variant: 'destructive' })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Senhas diferentes', description: 'Digite a mesma senha nos dois campos', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const { error } = await authHelpers.updatePassword(password)
      if (error) throw error
      toast({ title: 'Senha atualizada', description: 'Você já pode acessar o sistema.' })
      navigate('/dashboard')
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar senha', description: err?.message || 'Tente novamente', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription>Crie sua nova senha para continuar.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Atualizando...</> : 'Atualizar senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}