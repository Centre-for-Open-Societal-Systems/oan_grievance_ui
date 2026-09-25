pipeline {
    agent any

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '379220350808'
        IMAGE_REGISTRY  = '379220350808.dkr.ecr.ap-south-1.amazonaws.com'   // matches image_registry in inventory/group_vars/all/main.yml
        IMAGE_NAME      = 'oan-grievance-ui'   
        RKE2_NODE       = '13.233.56.204'
        K8S_NAMESPACE   = 'develop'
        DEPLOYMENT_NAME = 'grievance-ui'
        CONTAINER_NAME  = 'grievance-ui'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & test') {
            steps {
                sh '''
                    node --version
                    npm ci
                    npm run lint
                '''
                
            }
        }

        stage('Build image') {
            when { branch 'develop' }
            steps {
                script {
                    env.IMAGE_TAG_BUILD = "develop-${env.BUILD_NUMBER}"
                }
                sh """
                    docker build \
                        -t ${IMAGE_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG_BUILD} \
                        -t ${IMAGE_REGISTRY}/${IMAGE_NAME}:develop \
                        .
                """
            }
        }

        stage('Push image') {
            when { branch 'develop' }
            steps {
                
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} \
                            | docker login --username AWS --password-stdin ${IMAGE_REGISTRY}
                        docker push ${IMAGE_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG_BUILD}
                        docker push ${IMAGE_REGISTRY}/${IMAGE_NAME}:develop
                    """
                }
            }
        }

        stage('Deploy to develop (kubectl)') {
            when { branch 'develop' }
            steps {
               
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'grievance-dev-ssh-key',   // grievance.pem — create in Jenkins first, see setup notes
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no -i \$SSH_KEY \$SSH_USER@${RKE2_NODE} bash -s < /dev/null <<'ENDSSH'
set -euo pipefail

export KUBECONFIG="$HOME/.kube/config"
kubectl rollout restart deployment/${DEPLOYMENT_NAME} -n ${K8S_NAMESPACE}
kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${K8S_NAMESPACE} --timeout=180s
ENDSSH
                    """
                }
            }
        }

        stage('Verify') {
            when { branch 'develop' }
            steps {
                sh '''
                    code=$(curl -s -o /dev/null -w "%{http_code}" https://grievance-dev.oanstaging.com/)
                    echo "grievance-ui responded: $code"
                    [ "$code" = "200" ]
                '''
   
            }
        }
    }

    post {
        failure {
            echo "grievance-ui develop deploy failed — check the stage logs above."
        }
    }
}
