import { redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
export async function adminGuard(){const {data:{user}}=await supabase.auth.getUser();if(!user)throw redirect({to:'/auth'});const {data,error}=await supabase.rpc('has_role',{_user_id:user.id,_role:'admin'});if(error||!data)throw redirect({to:'/minha-conta'});}
