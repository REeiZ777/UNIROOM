"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L\u0027adresse e-mail est requise.")
    .email("Merci de saisir une adresse e-mail valide."),
  password: z
    .string()
    .trim()
    .min(1, "Le mot de passe est requis."),
});

const uiStrings = {
  emailLabel: "Adresse e-mail",
  passwordLabel: "Mot de passe",
  submitLabel: "Se connecter",
  success: "Connexion r\u00E9ussie. Redirection...",
  genericError:
    "Impossible de vous connecter. Merci de v\u00E9rifier vos identifiants.",
  unexpectedError:
    "Une erreur inattendue est survenue. Merci de r\u00E9essayer.",
  rateLimitError:
    "Trop de tentatives de connexion. Merci de patienter avant de r\u00E9essayer.",

} as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (response?.status === 429) {
        toast.error(uiStrings.rateLimitError);
        return;
      }

      if (response?.error) {
        toast.error(uiStrings.genericError);
        return;
      }

      toast.success(uiStrings.success);
      const redirectTo = searchParams.get("from") ?? "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Erreur de connexion", error);
      toast.error(uiStrings.unexpectedError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">{uiStrings.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@uniroom.school"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">{uiStrings.passwordLabel}</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {uiStrings.submitLabel}
        </Button>
      </form>
    </Form>
  );
}


