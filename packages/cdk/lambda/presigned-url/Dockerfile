FROM public.ecr.aws/lambda/python:3.12-arm64

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY index.py ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
