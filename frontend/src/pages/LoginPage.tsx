import { Link, useNavigate, useSearchParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { AuthDivider } from "@/components/AuthDivider"
import { GoogleSignInButton } from "@/components/GoogleSignInButton"

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const returnTo = searchParams.get("returnTo") || "/dashboard/patients"

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (values: LoginValues) => {
        try {
            await authClient.signIn.email({
                email: values.email,
                password: values.password,
            }, {
                onSuccess: () => {
                    toast.success("Signed in successfully")
                    navigate(returnTo, { replace: true })
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message ?? "Sign in failed")
                },
            })
        } catch {
            toast.error("Sign in failed")
        }
    }

    return (
        <Card className= "w-full" >
        <CardHeader className="text-center" >
            <CardTitle className="text-2xl" > Welcome back </CardTitle>
                <CardDescription>
    Sign in to your account to continue
    </CardDescription>
        </CardHeader>
        < CardContent className = "space-y-4" >
            <form onSubmit={ handleSubmit(onSubmit) } className = "space-y-4" >
                <div className="space-y-2" >
                    <Label htmlFor="email" > Email </Label>
                        < Input
    id = "email"
    type = "email"
    placeholder = "you@example.com"
    autoComplete = "email"
    aria-invalid={ !!errors.email }
    aria-describedby={ errors.email ? "email-error" : undefined }
    {...register("email") }
                        />
    {
        errors.email && (
            <p id="email-error" role = "alert" className = "text-sm text-destructive" >
                { errors.email.message }
                </p>
                        )
    }
    </div>
        < div className = "space-y-2" >
            <Label htmlFor="password" > Password </Label>
                < Input
    id = "password"
    type = "password"
    placeholder = "••••••••"
    autoComplete = "current-password"
    aria-invalid={ !!errors.password }
    aria-describedby={ errors.password ? "password-error" : undefined }
    {...register("password") }
                        />
    {
        errors.password && (
            <p id="password-error" role = "alert" className = "text-sm text-destructive" >
                { errors.password.message }
                </p>
                        )
    }
    </div>
        < Button
    type = "submit"
    className = "w-full"
    disabled = { isSubmitting }
        >
        { isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )
}
Sign in
    </Button>
    </form>

    < AuthDivider />
    <GoogleSignInButton disabled={ isSubmitting } callbackURL = { returnTo } />
        </CardContent>
        < CardFooter className = "justify-center" >
            <p className="text-sm text-muted-foreground" >
                Don & apos;t have an account ? { " "}
                    < Link
                        to = "/register"
className = "text-primary underline-offset-4 hover:underline"
    >
    Create one
        </Link>
        </p>
        </CardFooter>
        </Card>
    )
}
