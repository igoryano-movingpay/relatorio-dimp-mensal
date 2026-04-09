import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeClosed } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ThemeToggle } from "@/components/theme-toggle";
import AuthBackgroundShape from "@/assets/svg/auth-background-shape";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/regulatorios/api/v1/acessar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.access_token || data.token;
        if (token) {
          sessionStorage.setItem("access_token", token);
          navigate("/dashboard");
        } else {
          alert("Erro: Token não recebido do servidor.");
        }
      } else {
        alert(data.message || "Credenciais inválidas. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar ao servidor. Verifique sua conexão e o CORS.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950'>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className='absolute'>
        <AuthBackgroundShape className="text-zinc-200 dark:text-zinc-800/50" />
      </div>

      <Card className='z-10 w-100 shadow-md sm:max-w-lg relative bg-white dark:bg-zinc-900 dark:border-zinc-800 border-transparent border'>
        <CardHeader className='gap-6'>

          <div>
            <CardTitle className='mb-1.5 text-2xl text-zinc-950 dark:text-zinc-50'>Relatório Mensal</CardTitle>
            <CardDescription className='text-base text-zinc-500 dark:text-zinc-400'>Insira suas credenciais para acessar o painel.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form className='space-y-4' onSubmit={handleLogin}>
            {/* Email */}
            <div className='space-y-1 text-left'>
              <Label htmlFor='userEmail' className='leading-5 font-medium text-sm text-zinc-900 dark:text-zinc-100'>
                Email
              </Label>
              <Input 
                id='userEmail' 
                type='email' 
                placeholder='voce@empresa.com' 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='h-10 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 rounded-lg shadow-none transition-all focus-visible:outline-none focus-visible:border-zinc-400 focus-visible:ring-4 focus-visible:ring-zinc-200/50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-700/50'
                required
              />
            </div>

            {/* Password */}
            <div className='w-full space-y-1 text-left'>
              <Label htmlFor='password' className='leading-5 font-medium text-sm text-zinc-900 dark:text-zinc-100'>
                Senha
              </Label>
              <div className='relative'>
                <Input 
                  id='password' 
                  type={isVisible ? 'text' : 'password'} 
                  placeholder='••••••••••••••••' 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='h-10 pr-9 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 rounded-lg shadow-none transition-all focus-visible:outline-none focus-visible:border-zinc-400 focus-visible:ring-4 focus-visible:ring-zinc-200/50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-700/50'
                  required 
                />
                <Button
                  type="button"
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsVisible(!isVisible)}
                  className='text-zinc-500 dark:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent dark:hover:bg-transparent h-full px-3'
                >
                  {isVisible ? <Eye width={16}/> : <EyeClosed width={16}/>}
                </Button>
              </div>
            </div>

            <Button className='w-full mt-2 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg shadow-sm h-10' type='submit' disabled={isLoading}>
              {isLoading ? "Acessando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
