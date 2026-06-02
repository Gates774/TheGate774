-- Create knowledge_hub_content table for e-learning content
CREATE TABLE public.knowledge_hub_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'beginner',
  estimated_time_minutes INTEGER DEFAULT 5,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_hub_content ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage content
CREATE POLICY "Admins can manage knowledge hub content" 
ON public.knowledge_hub_content 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create policy for all authenticated users to view published content
CREATE POLICY "Authenticated users can view published content" 
ON public.knowledge_hub_content 
FOR SELECT 
USING (is_published = true AND auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_knowledge_hub_content_updated_at
BEFORE UPDATE ON public.knowledge_hub_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();