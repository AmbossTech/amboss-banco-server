#!/bin/bash

if [[ $AMBOSS_ADD_ENVS ]]; then
    aws s3 cp s3://amboss-envs/$ENV/$SERVICE/.env .
    aws s3 cp s3://amboss-envs/$ENV/$SERVICE/config.yaml .
fi

# Start server
npm run start:prod
