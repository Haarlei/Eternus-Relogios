CREATE POLICY "Usuários podem deletar suas parcelas"
ON public.parcelas
FOR DELETE
USING (auth.uid() = user_id);