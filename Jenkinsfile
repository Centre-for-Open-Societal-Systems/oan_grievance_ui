pipeline {
    agent any

    options {
        // Two overlapping runs of the same branch would fight over the same Deployment.
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '379220350808'
        IMAGE_REGISTRY  = '379220350808.dkr.ecr.ap-south-1.amazonaws.com'   // matches image_registry in inventory/group_vars/all/main.yml
        IMAGE_NAME      = 'oan-grievance-ui'
        RKE2_NODE       = '13.233.56.204'
        // Must match the live objects: kubectl get deploy -n develop / -n staging
        // (the deploy stage fails fast with a clear message if either is wrong)
        DEPLOYMENT_NAME = 'grievance-ui'
        CONTAINER_NAME  = 'grievance-ui'
        // Per-branch target (namespace, public URL) is chosen in the Checkout stage:
        //   develop -> namespace develop, image tag develop-<build>-<sha>
        //   staging -> namespace staging, image tag staging-<build>-<sha>
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Which environment this branch deploys to. Anything else (e.g. PR builds) only runs
                    // checkout + install/test; the build/push/deploy stages below are skipped for it.
                    // "/" has no landing page and redirects to /login, so verify /login directly.
                    def targets = [
                        develop: [
                            namespace: 'develop',
                            verifyUrl: 'https://grievance-dev.oanstaging.com/login'
                        ],
                        staging: [
                            namespace: 'staging',
                            // CONFIRM: kubectl get ingress -n staging (UI host)
                            verifyUrl: 'https://grievance-staging.oanstaging.com/login'
                        ]
                    ]
                    def target = targets[env.BRANCH_NAME]
                    env.TARGET_ENV    = target ? env.BRANCH_NAME : 'develop'
                    def t = target ?: targets.develop
                    env.K8S_NAMESPACE = t.namespace
                    env.VERIFY_URL    = t.verifyUrl

                    // Immutable, traceable tag: <env>-<build number>-<short git sha>
                    def sha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
                    env.IMAGE_TAG_BUILD = "${env.TARGET_ENV}-${env.BUILD_NUMBER}-${sha}"
                    env.FULL_IMAGE      = "${env.IMAGE_REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG_BUILD}"
                    echo "Branch ${env.BRANCH_NAME} -> namespace ${env.K8S_NAMESPACE}, image ${env.FULL_IMAGE}"
                }
            }
        }

        stage('Install & test') {
            steps {
                // package.json needs node >= 24 and the repo uses pnpm, so run in a node 24 container
                // instead of depending on whatever Node the Jenkins host has.
                sh '''
                    docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
                        -v "$PWD":/app -w /app node:24-alpine \
                        sh -c "npx -y pnpm@11.17.0 install --frozen-lockfile && npx -y pnpm@11.17.0 run lint"
                '''
            }
        }

        stage('Build image') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                // Dockerfile lives at the repo root
                sh '''
                    docker build --pull \
                        -t "$FULL_IMAGE" \
                        -t "$IMAGE_REGISTRY/$IMAGE_NAME:$TARGET_ENV" \
                        .
                '''
            }
        }

        stage('Push image') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh '''
                        aws ecr get-login-password --region "$AWS_REGION" \
                            | docker login --username AWS --password-stdin "$IMAGE_REGISTRY"
                        docker push "$FULL_IMAGE"
                        docker push "$IMAGE_REGISTRY/$IMAGE_NAME:$TARGET_ENV"
                    '''
                }
            }
        }

        stage('Deploy (kubectl)') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'grievance-dev-ssh-key',   // grievance.pem
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    // Deploys the immutable build tag (not a floating tag + rollout restart),
                    // so every Jenkins build is a real, traceable change to the Deployment.
                    // Values are passed as arguments; the remote script is a quoted heredoc.
                    sh '''
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$RKE2_NODE" \
    bash -s -- "$DEPLOYMENT_NAME" "$CONTAINER_NAME" "$FULL_IMAGE" "$K8S_NAMESPACE" <<'ENDSSH'
set -euo pipefail
DEPLOY="$1"; CONTAINER="$2"; IMAGE="$3"; NS="$4"
# Non-interactive SSH sessions do not load the login PATH; RKE2 keeps kubectl in its own bin dir
export PATH="$PATH:/var/lib/rancher/rke2/bin:/usr/local/bin:/snap/bin"
export KUBECONFIG="$HOME/.kube/config"

# Fail fast if the names in the Jenkinsfile do not match the cluster
kubectl get deployment "$DEPLOY" -n "$NS" > /dev/null
if ! kubectl get deployment "$DEPLOY" -n "$NS" \
        -o jsonpath='{.spec.template.spec.containers[*].name}' | tr ' ' '\\n' | grep -qx "$CONTAINER"; then
    echo "Container '$CONTAINER' not found in deployment/$DEPLOY. Containers present:"
    kubectl get deployment "$DEPLOY" -n "$NS" -o jsonpath='{.spec.template.spec.containers[*].name}'; echo
    exit 1
fi

echo "Deploying $IMAGE to deployment/$DEPLOY ($NS)"
kubectl set image "deployment/$DEPLOY" "$CONTAINER=$IMAGE" -n "$NS"

if ! kubectl rollout status "deployment/$DEPLOY" -n "$NS" --timeout=180s; then
    echo "Rollout failed, rolling back"
    kubectl rollout undo "deployment/$DEPLOY" -n "$NS"
    exit 1
fi
ENDSSH
                    '''
                }
            }
        }

        stage('Verify') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                sh '''
                    for i in $(seq 1 10); do
                        code=$(curl -s -o /dev/null -w "%{http_code}" "$VERIFY_URL" || true)
                        echo "attempt $i: $VERIFY_URL -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "grievance-ui did not return 200 at $VERIFY_URL"
                    exit 1
                '''
            }
        }
    }

    post {
        failure {
            echo "grievance-ui ${env.BRANCH_NAME} deploy failed (namespace ${env.K8S_NAMESPACE}). Check the stage logs above."
        }
    }
}
